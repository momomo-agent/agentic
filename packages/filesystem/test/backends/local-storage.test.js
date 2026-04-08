import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Mock localStorage for Node.js environment
const store = new Map()
global.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
  get length() { return store.size },
  key: i => Array.from(store.keys())[i] ?? null,
  clear: () => store.clear()
}

const { LocalStorageBackend } = await import('../../dist/index.js')

describe('LocalStorageBackend', () => {
  let backend

  beforeEach(() => { store.clear(); backend = new LocalStorageBackend() })

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
    await backend.set('/foo.txt', 'a')
    await backend.set('/bar.txt', 'b')
    const paths = await backend.list()
    assert.ok(paths.every(p => p.startsWith('/')))
    assert.ok(paths.includes('/foo.txt'))
    assert.ok(paths.includes('/bar.txt'))
  })

  it('scan returns matching lines', async () => {
    await backend.set('/f.txt', 'line one\nfoo bar\nline three')
    const results = await backend.scan('foo')
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
