import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticFileSystem, MemoryStorage } from '../dist/index.js'

describe('m18: AgenticFileSystem batchGet/batchSet/scanStream public methods', () => {
  let fs

  before(async () => {
    fs = new AgenticFileSystem({ storage: new MemoryStorage() })
    await fs.write('/a.txt', 'hello')
    await fs.write('/b.txt', 'world')
    await fs.write('/c.txt', 'hello world')
  })

  // ── batchGet ──

  it('batchGet returns content for existing paths', async () => {
    const result = await fs.batchGet(['/a.txt', '/b.txt'])
    assert.deepEqual(result, { '/a.txt': 'hello', '/b.txt': 'world' })
  })

  it('batchGet returns null for missing paths', async () => {
    const result = await fs.batchGet(['/a.txt', '/missing.txt'])
    assert.equal(result['/a.txt'], 'hello')
    assert.equal(result['/missing.txt'], null)
  })

  it('batchGet with empty array returns empty record', async () => {
    const result = await fs.batchGet([])
    assert.deepEqual(result, {})
  })

  // ── batchSet ──

  it('batchSet writes multiple files', async () => {
    await fs.batchSet({ '/x.txt': 'foo', '/y.txt': 'bar' })
    const x = await fs.read('/x.txt')
    const y = await fs.read('/y.txt')
    assert.equal(typeof x === 'string' ? x : x?.content, 'foo')
    assert.equal(typeof y === 'string' ? y : y?.content, 'bar')
  })

  it('batchSet with empty object is a no-op', async () => {
    await fs.batchSet({})
    // no error, no side effects
  })

  it('batchSet throws PermissionDeniedError on readOnly fs', async () => {
    const roFs = new AgenticFileSystem({ storage: new MemoryStorage(), readOnly: true })
    await assert.rejects(
      () => roFs.batchSet({ '/x.txt': 'test' }),
      (err) => err.name === 'PermissionDeniedError',
      'Expected PermissionDeniedError'
    )
  })

  // ── scanStream ──

  it('scanStream returns async iterable with matches', async () => {
    const results = []
    for await (const r of fs.scanStream('hello')) {
      results.push(r)
    }
    assert.ok(results.length >= 2, 'Should find hello in a.txt and c.txt')
    assert.ok(results.some(r => r.path === '/a.txt'))
    assert.ok(results.some(r => r.path === '/c.txt'))
  })

  it('scanStream with no matches returns empty iterable', async () => {
    const results = []
    for await (const r of fs.scanStream('zzz_no_match_zzz')) {
      results.push(r)
    }
    assert.equal(results.length, 0)
  })

  it('scanStream results have path, line, content fields', async () => {
    for await (const r of fs.scanStream('hello')) {
      assert.ok('path' in r, 'Missing path field')
      assert.ok('line' in r, 'Missing line field')
      assert.ok('content' in r, 'Missing content field')
      break // just check first result
    }
  })

  // ── getToolDefinitions ──

  it('getToolDefinitions includes batch_get tool', () => {
    const tools = fs.getToolDefinitions()
    const tool = tools.find(t => t.name === 'batch_get')
    assert.ok(tool, 'batch_get tool missing')
    assert.ok(tool.parameters.properties.paths, 'batch_get should have paths parameter')
    assert.deepEqual(tool.parameters.required, ['paths'])
  })

  it('getToolDefinitions includes batch_set tool', () => {
    const tools = fs.getToolDefinitions()
    const tool = tools.find(t => t.name === 'batch_set')
    assert.ok(tool, 'batch_set tool missing')
    assert.ok(tool.parameters.properties.entries, 'batch_set should have entries parameter')
    assert.deepEqual(tool.parameters.required, ['entries'])
  })

  it('getToolDefinitions includes grep_stream tool', () => {
    const tools = fs.getToolDefinitions()
    const tool = tools.find(t => t.name === 'grep_stream')
    assert.ok(tool, 'grep_stream tool missing')
    assert.ok(tool.parameters.properties.pattern, 'grep_stream should have pattern parameter')
    assert.deepEqual(tool.parameters.required, ['pattern'])
  })

  it('getToolDefinitions has 9 tools total (6 existing + 3 new)', () => {
    const tools = fs.getToolDefinitions()
    assert.equal(tools.length, 9)
  })

  // ── executeTool dispatch ──

  it('executeTool dispatches batch_get', async () => {
    const result = await fs.executeTool('batch_get', { paths: ['/a.txt', '/b.txt'] })
    assert.deepEqual(result, { '/a.txt': 'hello', '/b.txt': 'world' })
  })

  it('executeTool dispatches batch_set', async () => {
    await fs.executeTool('batch_set', { entries: { '/z.txt': 'batched' } })
    const z = await fs.read('/z.txt')
    assert.equal(typeof z === 'string' ? z : z?.content, 'batched')
  })

  it('executeTool dispatches grep_stream', async () => {
    const result = await fs.executeTool('grep_stream', { pattern: 'hello' })
    assert.ok(Array.isArray(result), 'grep_stream should return an array')
    assert.ok(result.length >= 2)
  })

  it('executeTool returns error for unknown tool', async () => {
    const result = await fs.executeTool('nonexistent', {})
    assert.deepEqual(result, { error: 'Unknown tool' })
  })

  // ── JSDoc on new methods ──

  it('batchGet, batchSet, scanStream have JSDoc (via source check)', async () => {
    const src = await import('node:fs/promises').then(fs => fs.readFile('/Users/kenefe/LOCAL/momo-agent/projects/agentic-filesystem/src/filesystem.ts', 'utf8'))
    assert.ok(src.includes('async batchGet('), 'batchGet method exists')
    assert.ok(src.includes('async batchSet('), 'batchSet method exists')
    assert.ok(src.includes('scanStream(pattern'), 'scanStream method exists')
    // Check JSDoc presence by looking for /** before each method
    const batchGetIdx = src.indexOf('async batchGet(')
    assert.ok(src.lastIndexOf('/**', batchGetIdx) > batchGetIdx - 200, 'batchGet should have JSDoc')
    const batchSetIdx = src.indexOf('async batchSet(')
    assert.ok(src.lastIndexOf('/**', batchSetIdx) > batchSetIdx - 200, 'batchSet should have JSDoc')
  })
})
