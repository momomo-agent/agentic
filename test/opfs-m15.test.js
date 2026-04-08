import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// OPFS is browser-only — all tests skip in Node.js
const hasOPFS = typeof globalThis.navigator !== 'undefined' &&
  typeof globalThis.navigator.storage?.getDirectory === 'function'

describe('OPFSBackend m15 fixes', { skip: !hasOPFS ? 'OPFS not available in Node.js' : false }, () => {
  let backend

  before(async () => {
    const { OPFSBackend } = await import('../src/backends/opfs.js')
    backend = new OPFSBackend()
  })

  // task-1775582110082: delete() no-ops on missing path
  it('delete missing path resolves without throwing', async () => {
    await assert.doesNotReject(() => backend.delete('/nonexistent-m15.txt'))
  })

  it('delete existing path removes file', async () => {
    await backend.set('/del-m15.txt', 'x')
    await backend.delete('/del-m15.txt')
    assert.equal(await backend.get('/del-m15.txt'), null)
  })

  // task-1775582140362: empty-path validation
  it('get("") throws IOError', async () => {
    await assert.rejects(() => backend.get(''), /Path cannot be empty/)
  })

  it('set("", ...) throws IOError', async () => {
    await assert.rejects(() => backend.set('', 'x'), /Path cannot be empty/)
  })

  it('delete("") throws IOError', async () => {
    await assert.rejects(() => backend.delete(''), /Path cannot be empty/)
  })

  // stat() error handling and directory support
  it('stat("") throws IOError', async () => {
    await assert.rejects(() => backend.stat(''), /Path cannot be empty/)
  })

  it('stat on missing path throws NotFoundError', async () => {
    await assert.rejects(
      () => backend.stat('/nonexistent-opfs-stat-verify.txt'),
      (err) => err.name === 'NotFoundError'
    )
  })

  it('stat on directory returns isDirectory: true', async () => {
    await backend.set('/stat-dir-test/file.txt', 'hello')
    const result = await backend.stat('/stat-dir-test')
    assert.ok(result !== null)
    assert.equal(result.isDirectory, true)
    assert.equal(result.size, 0)
  })
})
