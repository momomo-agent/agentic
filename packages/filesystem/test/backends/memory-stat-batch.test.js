import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorage } from '../../dist/index.js'

describe('MemoryStorage - stat', () => {
  let backend

  before(() => { backend = new MemoryStorage() })

  it('stat returns size for existing file', async () => {
    await backend.set('/stat-file.txt', 'hello world')
    const s = await backend.stat('/stat-file.txt')
    assert.equal(s.size, 11)
    assert.equal(s.isDirectory, false)
    assert.equal(typeof s.mtime, 'number')
    assert.deepEqual(s.permissions, { read: true, write: true })
  })

  it('stat returns correct size for empty file', async () => {
    await backend.set('/empty.txt', '')
    const s = await backend.stat('/empty.txt')
    assert.equal(s.size, 0)
    assert.equal(s.isDirectory, false)
  })

  it('stat returns correct size for UTF-8 content', async () => {
    await backend.set('/utf8.txt', '你好世界')
    const s = await backend.stat('/utf8.txt')
    // MemoryStorage uses string .length (character count, not byte length)
    assert.equal(s.size, 4)
  })

  it('stat throws NotFoundError for missing file', async () => {
    await assert.rejects(
      () => backend.stat('/nonexistent.txt'),
      (err) => err.name === 'NotFoundError'
    )
  })

  it('stat with empty path throws IOError', async () => {
    await assert.rejects(
      () => backend.stat(''),
      (err) => err.name === 'IOError'
    )
  })

  it('stat reflects updated content size', async () => {
    await backend.set('/update.txt', 'short')
    const s1 = await backend.stat('/update.txt')
    await backend.set('/update.txt', 'much longer content here')
    const s2 = await backend.stat('/update.txt')
    assert.ok(s2.size > s1.size)
  })
})

describe('MemoryStorage - batchGet', () => {
  let backend

  beforeEach(() => { backend = new MemoryStorage() })

  it('batchGet returns all requested files', async () => {
    await backend.set('/a.txt', 'alpha')
    await backend.set('/b.txt', 'bravo')
    const result = await backend.batchGet(['/a.txt', '/b.txt'])
    assert.equal(result['/a.txt'], 'alpha')
    assert.equal(result['/b.txt'], 'bravo')
  })

  it('batchGet returns null for missing files', async () => {
    await backend.set('/exists.txt', 'data')
    const result = await backend.batchGet(['/exists.txt', '/missing.txt'])
    assert.equal(result['/exists.txt'], 'data')
    assert.equal(result['/missing.txt'], null)
  })

  it('batchGet with empty array returns empty object', async () => {
    const result = await backend.batchGet([])
    assert.deepEqual(result, {})
  })

  it('batchGet with all missing returns all null', async () => {
    const result = await backend.batchGet(['/no1.txt', '/no2.txt'])
    assert.equal(result['/no1.txt'], null)
    assert.equal(result['/no2.txt'], null)
  })
})

describe('MemoryStorage - batchSet', () => {
  let backend

  beforeEach(() => { backend = new MemoryStorage() })

  it('batchSet writes all entries', async () => {
    await backend.batchSet({ '/x.txt': '10', '/y.txt': '20', '/z.txt': '30' })
    assert.equal(await backend.get('/x.txt'), '10')
    assert.equal(await backend.get('/y.txt'), '20')
    assert.equal(await backend.get('/z.txt'), '30')
  })

  it('batchSet overwrites existing files', async () => {
    await backend.set('/old.txt', 'original')
    await backend.batchSet({ '/old.txt': 'updated' })
    assert.equal(await backend.get('/old.txt'), 'updated')
  })

  it('batchSet with empty object does nothing', async () => {
    await backend.set('/keep.txt', 'value')
    await backend.batchSet({})
    assert.equal(await backend.get('/keep.txt'), 'value')
  })

  it('batchSet entries appear in list', async () => {
    await backend.batchSet({ '/list-a.txt': 'a', '/list-b.txt': 'b' })
    const paths = await backend.list()
    assert.ok(paths.includes('/list-a.txt'))
    assert.ok(paths.includes('/list-b.txt'))
  })
})

describe('MemoryStorage - scanStream', () => {
  let backend

  beforeEach(() => { backend = new MemoryStorage() })

  it('scanStream yields matching results', async () => {
    await backend.set('/stream.txt', 'line one\nfoo bar\nline three')
    const results = []
    for await (const r of backend.scanStream('foo')) results.push(r)
    assert.equal(results.length, 1)
    assert.equal(results[0].content, 'foo bar')
    assert.equal(results[0].line, 2)
    assert.equal(results[0].path, '/stream.txt')
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
    const paths = results.map(r => r.path).sort()
    assert.deepEqual(paths, ['/f1.txt', '/f2.txt'])
  })
})
