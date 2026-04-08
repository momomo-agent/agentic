import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { LocalStorageBackend } from '../../dist/index.js'

// Mock localStorage for Node.js environment
function makeMockLocalStorage() {
  const store = new Map()
  return {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: k => store.delete(k),
    get length() { return store.size },
    key: i => Array.from(store.keys())[i] ?? null,
    clear: () => store.clear()
  }
}

describe('LocalStorageBackend - stat', () => {
  let backend

  before(() => {
    global.localStorage = makeMockLocalStorage()
    backend = new LocalStorageBackend()
  })

  it('stat returns size for existing file', async () => {
    await backend.set('/stat-file.txt', 'hello world')
    const s = await backend.stat('/stat-file.txt')
    assert.equal(s.size, 11)
    assert.equal(s.isDirectory, false)
    assert.equal(typeof s.mtime, 'number')
    assert.deepEqual(s.permissions, { read: true, write: true })
  })

  it('stat returns correct size for empty file', async () => {
    await backend.set('/empty-stat.txt', '')
    const s = await backend.stat('/empty-stat.txt')
    assert.equal(s.size, 0)
    assert.equal(s.isDirectory, false)
  })

  it('stat returns correct size for multiline content', async () => {
    const content = 'line1\nline2\nline3'
    await backend.set('/multiline.txt', content)
    const s = await backend.stat('/multiline.txt')
    assert.equal(s.size, content.length)
  })

  it('stat throws NotFoundError for missing file', async () => {
    await assert.rejects(
      () => backend.stat('/nonexistent-stat.txt'),
      (err) => err.name === 'NotFoundError'
    )
  })

  it('stat with empty path throws IOError', async () => {
    await assert.rejects(
      () => backend.stat(''),
      (err) => err.name === 'IOError'
    )
  })

  it('stat mtime is 0 for localStorage backend', async () => {
    await backend.set('/mtime-test.txt', 'data')
    const s = await backend.stat('/mtime-test.txt')
    assert.equal(s.mtime, 0)
  })
})

describe('LocalStorageBackend - scanStream', () => {
  let backend

  beforeEach(() => {
    global.localStorage = makeMockLocalStorage()
    backend = new LocalStorageBackend()
  })

  it('scanStream yields matching results', async () => {
    await backend.set('/stream.txt', 'line one\nfoo bar\nline three')
    const results = []
    for await (const r of backend.scanStream('foo')) results.push(r)
    assert.equal(results.length, 1)
    assert.equal(results[0].content, 'foo bar')
    assert.equal(results[0].line, 2)
  })

  it('scanStream yields nothing for no match', async () => {
    await backend.set('/nope.txt', 'some content')
    const results = []
    for await (const r of backend.scanStream('zzznotfound')) results.push(r)
    assert.equal(results.length, 0)
  })

  it('scanStream yields multiple matches across files', async () => {
    await backend.set('/f1.txt', 'target here')
    await backend.set('/f2.txt', 'also target')
    const results = []
    for await (const r of backend.scanStream('target')) results.push(r)
    assert.equal(results.length, 2)
  })

  it('scanStream yields multiple matches on same line', async () => {
    await backend.set('/multi.txt', 'abc\ntarget x\ntarget y\nxyz')
    const results = []
    for await (const r of backend.scanStream('target')) results.push(r)
    assert.equal(results.length, 2)
    assert.equal(results[0].line, 2)
    assert.equal(results[1].line, 3)
  })

  it('scanStream on empty storage yields nothing', async () => {
    const results = []
    for await (const r of backend.scanStream('anything')) results.push(r)
    assert.equal(results.length, 0)
  })

  it('scanStream result has correct path property', async () => {
    await backend.set('/path-test.txt', 'matchme')
    const results = []
    for await (const r of backend.scanStream('matchme')) results.push(r)
    assert.equal(results.length, 1)
    assert.equal(results[0].path, '/path-test.txt')
    assert.equal(typeof results[0].line, 'number')
    assert.equal(typeof results[0].content, 'string')
  })
})
