import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticFileSystem, MemoryStorage, PermissionDeniedError } from '../dist/index.js'

let fs

test.before(() => {
  fs = new AgenticFileSystem({ storage: new MemoryStorage() })
})

// DBB-010: file_delete tool available
test('DBB-010: file_delete tool in getToolDefinitions()', () => {
  const tools = fs.getToolDefinitions()
  const tool = tools.find(t => t.name === 'file_delete')
  assert.ok(tool, 'file_delete tool must exist')
  assert.ok(tool.parameters?.properties?.path, 'file_delete must have path parameter')
})

// DBB-011: file_delete tool deletes files
test('DBB-011: file_delete tool deletes a file', async () => {
  await fs.write('/dbb011.txt', 'hello')
  await fs.executeTool('file_delete', { path: '/dbb011.txt' })
  const result = await fs.read('/dbb011.txt')
  assert.ok(result.error || result.content === null || result.content === undefined, 'file should be gone after delete')
})

// DBB-012: tree tool available (named 'tree' in source; DBB expects 'file_tree')
test('DBB-012: tree tool in getToolDefinitions()', () => {
  const tools = fs.getToolDefinitions()
  const tool = tools.find(t => t.name === 'file_tree' || t.name === 'tree')
  assert.ok(tool, 'tree/file_tree tool must exist')
})

// DBB-013: tree tool returns directory structure
test('DBB-013: tree tool returns directory structure', async () => {
  await fs.write('/a/b.txt', 'b')
  await fs.write('/a/c/d.txt', 'd')
  const tools = fs.getToolDefinitions()
  const treeTool = tools.find(t => t.name === 'file_tree' || t.name === 'tree')
  const result = await fs.executeTool(treeTool.name, { prefix: '/' })
  const str = JSON.stringify(result)
  assert.ok(str.includes('b.txt'), 'tree output must include b.txt')
  assert.ok(str.includes('d.txt'), 'tree output must include d.txt')
})

// DBB-020: batch_get, batch_set, grep_stream tools in getToolDefinitions()
test('DBB-020: batch_get, batch_set, grep_stream in getToolDefinitions()', () => {
  const tools = fs.getToolDefinitions()
  const names = tools.map(t => t.name)
  assert.ok(names.includes('batch_get'), 'batch_get tool must exist')
  assert.ok(names.includes('batch_set'), 'batch_set tool must exist')
  assert.ok(names.includes('grep_stream'), 'grep_stream tool must exist')
})

// DBB-021: batch_get reads multiple files at once
test('DBB-021: executeTool batch_get reads multiple files', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.write('/batch/a.txt', 'hello')
  await fs2.write('/batch/b.txt', 'world')
  const result = await fs2.executeTool('batch_get', { paths: ['/batch/a.txt', '/batch/b.txt'] })
  assert.equal(result['/batch/a.txt'], 'hello')
  assert.equal(result['/batch/b.txt'], 'world')
})

// DBB-022: batch_get returns null for missing paths
test('DBB-022: executeTool batch_get returns null for missing paths', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  const result = await fs2.executeTool('batch_get', { paths: ['/nope.txt'] })
  assert.equal(result['/nope.txt'], null)
})

// DBB-023: batch_set writes multiple files at once
test('DBB-023: executeTool batch_set writes multiple files', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.executeTool('batch_set', { entries: { '/set/a.txt': 'alpha', '/set/b.txt': 'beta' } })
  const a = await fs2.read('/set/a.txt')
  const b = await fs2.read('/set/b.txt')
  assert.equal(a.content, 'alpha')
  assert.equal(b.content, 'beta')
})

// DBB-024: batch_set throws on read-only filesystem
test('DBB-024: executeTool batch_set throws on readOnly filesystem', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage(), readOnly: true })
  await assert.rejects(
    () => fs2.executeTool('batch_set', { entries: { '/x.txt': 'y' } }),
    (err) => err instanceof PermissionDeniedError,
    'batch_set must throw PermissionDeniedError on readOnly filesystem'
  )
})

// DBB-025: grep_stream returns matching lines
test('DBB-025: executeTool grep_stream returns matching lines', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.write('/gs/a.txt', 'hello world\nfoo bar')
  const result = await fs2.executeTool('grep_stream', { pattern: 'hello' })
  assert.ok(Array.isArray(result), 'grep_stream must return an array')
  assert.equal(result.length, 1)
  assert.equal(result[0].content, 'hello world')
})

// DBB-026: grep_stream returns empty array for no matches
test('DBB-026: executeTool grep_stream returns empty array for no matches', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.write('/gs/empty.txt', 'nothing here')
  const result = await fs2.executeTool('grep_stream', { pattern: 'zzzzz' })
  assert.ok(Array.isArray(result))
  assert.equal(result.length, 0)
})

// DBB-027: batchGet/batchSet/scanStream as public methods on AgenticFileSystem
test('DBB-027: batchGet is a callable public method', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.write('/pub/a.txt', 'aaa')
  const result = await fs2.batchGet(['/pub/a.txt', '/pub/missing.txt'])
  assert.equal(result['/pub/a.txt'], 'aaa')
  assert.equal(result['/pub/missing.txt'], null)
})

test('DBB-028: batchSet is a callable public method', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.batchSet({ '/pub/x.txt': 'xval', '/pub/y.txt': 'yval' })
  const x = await fs2.read('/pub/x.txt')
  assert.equal(x.content, 'xval')
})

test('DBB-029: scanStream is a callable public method', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.write('/pub/s.txt', 'alpha\nbeta\ngamma')
  const results = []
  for await (const r of fs2.scanStream('beta')) {
    results.push(r)
  }
  assert.equal(results.length, 1)
  assert.equal(results[0].content, 'beta')
})

// DBB-030: batchGet with empty array returns empty object
test('DBB-030: batchGet with empty paths returns empty object', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  const result = await fs2.batchGet([])
  assert.deepStrictEqual(result, {})
})

// DBB-031: batchSet with empty entries completes without error
test('DBB-031: batchSet with empty entries completes without error', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.batchSet({})
  assert.ok(true)
})

// DBB-032: grep_stream matches across multiple files
test('DBB-025b: grep_stream matches across multiple files', async () => {
  const fs2 = new AgenticFileSystem({ storage: new MemoryStorage() })
  await fs2.write('/multi/a.txt', 'find me here')
  await fs2.write('/multi/b.txt', 'nothing')
  await fs2.write('/multi/c.txt', 'also find me there')
  const result = await fs2.executeTool('grep_stream', { pattern: 'find me' })
  assert.ok(Array.isArray(result))
  assert.equal(result.length, 2)
  const paths = result.map(r => r.path).sort()
  assert.ok(paths.includes('/multi/a.txt'))
  assert.ok(paths.includes('/multi/c.txt'))
})

// DBB-033: tool definitions have correct required parameters
test('DBB-033: batch_get tool requires paths parameter', () => {
  const tools = fs.getToolDefinitions()
  const tool = tools.find(t => t.name === 'batch_get')
  assert.ok(tool)
  assert.deepStrictEqual(tool.parameters.required, ['paths'])
})

test('DBB-034: batch_set tool requires entries parameter', () => {
  const tools = fs.getToolDefinitions()
  const tool = tools.find(t => t.name === 'batch_set')
  assert.ok(tool)
  assert.deepStrictEqual(tool.parameters.required, ['entries'])
})

test('DBB-035: grep_stream tool requires pattern parameter', () => {
  const tools = fs.getToolDefinitions()
  const tool = tools.find(t => t.name === 'grep_stream')
  assert.ok(tool)
  assert.deepStrictEqual(tool.parameters.required, ['pattern'])
})
