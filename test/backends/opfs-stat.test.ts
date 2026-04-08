import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const isNode = typeof navigator?.storage?.getDirectory !== 'function'

describe('OPFSBackend.stat()', () => {
  it('returns size from File.size and mtime from File.lastModified', async (t) => {
    if (isNode) { t.skip('browser only'); return }
    const { OPFSBackend } = await import('../../src/backends/opfs.js')
    const backend = new OPFSBackend()
    await backend.set('/stat-test.txt', 'hello')
    const meta = await backend.stat('/stat-test.txt')
    assert.ok(meta !== null)
    assert.ok(typeof meta.size === 'number' && meta.size > 0)
    assert.ok(typeof meta.mtime === 'number' && meta.mtime > 0)
    await backend.delete('/stat-test.txt')
  })

  it('throws NotFoundError for missing file', async (t) => {
    if (isNode) { t.skip('browser only'); return }
    const { OPFSBackend } = await import('../../src/backends/opfs.js')
    const backend = new OPFSBackend()
    await assert.rejects(
      () => backend.stat('/nonexistent-stat.txt'),
      (err: any) => err.name === 'NotFoundError'
    )
  })

  it('isDirectory is always false', async (t) => {
    if (isNode) { t.skip('browser only'); return }
    const { OPFSBackend } = await import('../../src/backends/opfs.js')
    const backend = new OPFSBackend()
    await backend.set('/dir-test.txt', 'x')
    const meta = await backend.stat('/dir-test.txt')
    assert.equal(meta?.isDirectory, false)
    await backend.delete('/dir-test.txt')
  })
})
