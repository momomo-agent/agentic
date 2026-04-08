import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tmpdir } from 'node:os'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { AgenticFileSystem, MemoryStorage, NodeFsBackend } from '../dist/index.js'

// stat() contract tests via NodeFsBackend (OPFSBackend/AgenticStoreBackend are browser-only)
// Verifies the {size, mtime} | null contract that all backends must implement

let tmpDir
test('setup', async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'afs-stat-test-'))
})

test('stat on existing file returns {size, mtime}', async () => {
  const storage = new NodeFsBackend(tmpDir)
  await storage.set('/hello', 'world')
  const result = await storage.stat('/hello')
  assert.ok(result != null)
  assert.ok(typeof result.size === 'number' && result.size > 0)
  assert.ok(typeof result.mtime === 'number' && result.mtime > 0)
})

test('stat on missing file throws NotFoundError', async () => {
  const storage = new NodeFsBackend(tmpDir)
  await assert.rejects(
    () => storage.stat('/nonexistent'),
    (err) => err.name === 'NotFoundError'
  )
})

// Verify OPFSBackend and AgenticStoreBackend export stat in their class shape
test('AgenticStoreBackend prototype has stat method', async () => {
  const { AgenticStoreBackend } = await import('../dist/index.js')
  assert.ok(typeof AgenticStoreBackend.prototype.stat === 'function')
})

test('OPFSBackend prototype has stat method', async () => {
  const { OPFSBackend } = await import('../dist/index.js')
  assert.ok(typeof OPFSBackend.prototype.stat === 'function')
})

test('teardown', async () => {
  await rm(tmpDir, { recursive: true })
})

// agent tool definitions
test('getToolDefinitions includes file_delete and file_tree', () => {
  const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
  const names = fs.getToolDefinitions().map(t => t.name)
  assert.ok(names.includes('file_delete'))
  assert.ok(names.includes('file_tree'))
})

test('file_delete tool requires path parameter', () => {
  const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
  const tool = fs.getToolDefinitions().find(t => t.name === 'file_delete')
  assert.ok(tool.parameters.required?.includes('path'))
})

test('executeTool file_delete removes file', async () => {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })
  await storage.set('/todelete', 'data')
  await fs.executeTool('file_delete', { path: '/todelete' })
  assert.strictEqual(await storage.get('/todelete'), null)
})

test('executeTool file_delete on missing path does not throw', async () => {
  const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
  await assert.doesNotReject(() => fs.executeTool('file_delete', { path: '/missing' }))
})

test('executeTool file_tree returns array', async () => {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })
  await storage.set('/a/b', 'x')
  const result = await fs.executeTool('file_tree', {})
  assert.ok(Array.isArray(result))
})

test('executeTool file_tree with prefix returns subtree', async () => {
  const storage = new MemoryStorage()
  const fs = new AgenticFileSystem({ storage })
  await storage.set('/docs/readme', 'hello')
  await storage.set('/src/index', 'code')
  const result = await fs.executeTool('file_tree', { prefix: '/docs' })
  assert.ok(Array.isArray(result))
  const str = JSON.stringify(result)
  assert.ok(str.includes('readme'))
  assert.ok(!str.includes('index'))
})
