import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorage } from '../../dist/index.js'

describe('MemoryStorage', () => {
  let backend

  before(() => { backend = new MemoryStorage() })

  it('set and get', async () => {
    await backend.set('/a.txt', 'hello')
    assert.equal(await backend.get('/a.txt'), 'hello')
  })

  it('get missing returns null', async () => {
    assert.equal(await backend.get('/missing.txt'), null)
  })

  it('delete removes file', async () => {
    await backend.set('/del.txt', 'x')
    await backend.delete('/del.txt')
    assert.equal(await backend.get('/del.txt'), null)
  })

  it('list returns paths with / prefix', async () => {
    const b = new MemoryStorage()
    await b.set('/foo.txt', 'a')
    await b.set('/bar.txt', 'b')
    const paths = await b.list()
    assert.ok(paths.every(p => p.startsWith('/')))
    assert.ok(paths.includes('/foo.txt'))
    assert.ok(paths.includes('/bar.txt'))
  })

  it('list with prefix filters results', async () => {
    const b = new MemoryStorage()
    await b.set('/dir/a.txt', '1')
    await b.set('/other/b.txt', '2')
    const paths = await b.list('/dir')
    assert.ok(paths.includes('/dir/a.txt'))
    assert.ok(!paths.includes('/other/b.txt'))
  })

  it('scan returns matching lines', async () => {
    const b = new MemoryStorage()
    await b.set('/f.txt', 'line one\nfoo bar\nline three')
    const results = await b.scan('foo')
    assert.equal(results.length, 1)
    assert.equal(results[0].content, 'foo bar')
    assert.equal(results[0].line, 2)
  })

  it('empty path throws', async () => {
    await assert.rejects(() => backend.get(''), /empty/i)
    await assert.rejects(() => backend.set('', 'x'), /empty/i)
    await assert.rejects(() => backend.delete(''), /empty/i)
  })
})
