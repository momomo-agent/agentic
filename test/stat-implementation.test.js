// Tests for task-1775558752316: stat() implementation on OPFSBackend and AgenticStoreBackend
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticFileSystem, NodeFsBackend, AgenticStoreBackend } from '../dist/index.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

function makeMemStore() {
  const data = new Map()
  return {
    async get(k) { return data.get(k) ?? undefined },
    async set(k, v) { data.set(k, v) },
    async delete(k) { data.delete(k) },
    async keys() { return [...data.keys()] },
    async has(k) { return data.has(k) },
  }
}

// AgenticStoreBackend.stat() tests
test('AgenticStoreBackend.stat() returns size and mtime for existing file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/test.txt', 'hello')
  const meta = await backend.stat('/test.txt')
  assert.ok(meta !== null, 'stat() must return non-null for existing file')
  assert.equal(meta.size, 5, 'size must be 5 bytes for "hello"')
  assert.ok(typeof meta.mtime === 'number' && meta.mtime > 0, 'mtime must be a positive number')
})

test('AgenticStoreBackend.stat() throws NotFoundError for missing file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await assert.rejects(
    () => backend.stat('/nonexistent.txt'),
    (err) => err.name === 'NotFoundError'
  )
})

test('AgenticStoreBackend.stat() handles UTF-8 correctly', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/test.txt', '你好世界') // 12 bytes in UTF-8
  const meta = await backend.stat('/test.txt')
  assert.ok(meta !== null)
  assert.equal(meta.size, 12, 'size must be 12 bytes for UTF-8 string')
})

test('AgenticStoreBackend.stat() handles empty file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/empty.txt', '')
  const meta = await backend.stat('/empty.txt')
  assert.ok(meta !== null)
  assert.equal(meta.size, 0, 'empty file should have size 0')
})

test('AgenticStoreBackend.stat() handles paths without leading slash', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/test.txt', 'data')
  const meta = await backend.stat('test.txt') // no leading slash
  assert.ok(meta !== null, 'stat() should normalize paths')
  assert.equal(meta.size, 4)
})

// Integration tests with AgenticFileSystem.ls()
test('AgenticStoreBackend: ls() populates size and mtime', async () => {
  const fs = new AgenticFileSystem({ storage: new AgenticStoreBackend(makeMemStore()) })
  await fs.write('/a.txt', 'data')
  const results = await fs.ls()
  const file = results.find(r => r.name === '/a.txt')
  assert.ok(file, 'file must exist in ls() results')
  assert.equal(file.size, 4, 'size should be 4 for "data"')
  assert.ok(typeof file.mtime === 'number' && file.mtime > 0, 'mtime should be a positive number')
})

test('NodeFsBackend: ls() populates size and mtime', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-stat-'))
  try {
    const fs = new AgenticFileSystem({ storage: new NodeFsBackend(dir) })
    await fs.write('/hello.txt', 'hello world')
    const results = await fs.ls()
    const file = results.find(r => r.name === '/hello.txt')
    assert.ok(file, 'file entry must exist')
    assert.equal(file.size, 11, 'size should be 11 for "hello world"')
    assert.ok(typeof file.mtime === 'number', 'mtime should be a number')
    assert.ok(file.mtime > 0, 'mtime should be positive')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// Cross-backend consistency tests
test('All backends with stat() return consistent metadata structure', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-cross-'))
  try {
    const backends = [
      { name: 'NodeFsBackend', backend: new NodeFsBackend(dir) },
      { name: 'AgenticStoreBackend', backend: new AgenticStoreBackend(makeMemStore()) }
    ]

    for (const { name, backend } of backends) {
      await backend.set('/test.txt', 'content')
      const meta = await backend.stat('/test.txt')

      assert.ok(meta !== null, `${name}: stat() should return non-null`)
      assert.equal(typeof meta.size, 'number', `${name}: size should be a number`)
      assert.equal(typeof meta.mtime, 'number', `${name}: mtime should be a number`)
      assert.ok(meta.size > 0, `${name}: size should be positive`)
      assert.ok(meta.mtime > 0, `${name}: mtime should be positive`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// Edge cases
test('stat() rejects empty path', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await assert.rejects(() => backend.stat(''))
})

test('stat() handles special characters in path', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/file with spaces.txt', 'data')
  const meta = await backend.stat('/file with spaces.txt')
  assert.ok(meta !== null, 'stat() should handle spaces in filenames')
  assert.equal(meta.size, 4)
})

test('stat() handles unicode in path', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/文件.txt', 'content')
  const meta = await backend.stat('/文件.txt')
  assert.ok(meta !== null, 'stat() should handle unicode in filenames')
  assert.equal(meta.size, 7)
})

// NOTE: OPFSBackend tests require a browser environment with OPFS support
// OPFSBackend.stat() implementation exists at src/backends/opfs.ts:96-104
// Manual browser testing required for:
// - OPFSBackend.stat() returns size and mtime from FileSystemFileHandle.getFile()
// - OPFSBackend.stat() returns null for missing files
// - OPFSBackend.stat() mtime updates on file modification
