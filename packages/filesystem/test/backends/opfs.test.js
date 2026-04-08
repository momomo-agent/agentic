import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'

// OPFS is browser-only — skip all tests in Node.js
const hasOPFS = typeof globalThis.navigator !== 'undefined' &&
  typeof globalThis.navigator.storage?.getDirectory === 'function'

describe('OPFSBackend', { skip: !hasOPFS ? 'OPFS not available in Node.js' : false }, () => {
  let backend

  before(async () => {
    const { OPFSBackend } = await import('../../dist/index.js')
    backend = new OPFSBackend()
  })

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
    const paths = await backend.list()
    assert.ok(paths.every(p => p.startsWith('/')))
  })

  it('scan returns matching lines', async () => {
    await backend.set('/scan.txt', 'hello world\nno match\nhello again')
    const results = await backend.scan('hello')
    assert.ok(results.length >= 2)
    assert.ok(results.every(r => 'path' in r && 'line' in r && 'content' in r))
  })

  it('empty path throws', async () => {
    await assert.rejects(() => backend.get(''), /empty/i)
    await assert.rejects(() => backend.set('', 'x'), /empty/i)
    await assert.rejects(() => backend.delete(''), /empty/i)
    await assert.rejects(() => backend.stat(''), /empty/i)
  })
})
