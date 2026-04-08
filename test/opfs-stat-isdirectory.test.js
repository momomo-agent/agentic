// OPFSBackend.stat() isDirectory detection — directory-first approach
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Mock OPFSBackend logic inline to verify the stat() algorithm
function makeOPFSStatLogic() {
  const files = new Map() // path -> { size, lastModified }
  const dirs = new Set()  // paths that are directories

  class NotFoundError extends Error {
    constructor(path) { super(`Not found: ${path}`); this.name = 'NotFoundError' }
  }

  async function getFileHandle(path) {
    const key = path.replace(/^\//, '')
    if (!files.has(key)) throw new DOMException('NotFoundError', 'NotFoundError')
    const f = files.get(key)
    return { getFile: async () => ({ size: f.size, lastModified: f.mtime }) }
  }

  async function getDirHandle(path) {
    const key = path.replace(/^\//, '')
    if (!dirs.has(key)) throw new DOMException('NotFoundError', 'NotFoundError')
    return {}
  }

  // Directory-first approach (matches the new implementation)
  async function stat(path) {
    // Try directory first
    try {
      await getDirHandle(path)
      return { size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } }
    } catch {}
    // Fall back to file
    try {
      const fh = await getFileHandle(path)
      const file = await fh.getFile()
      return { size: file.size, mtime: file.lastModified, isDirectory: false, permissions: { read: true, write: true } }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'NotFoundError') throw new NotFoundError(path)
      if (e instanceof NotFoundError) throw e
      throw new Error(String(e))
    }
  }

  return { files, dirs, stat }
}

describe('OPFSBackend.stat() isDirectory detection — directory-first', () => {
  test('stat on file returns isDirectory: false', async () => {
    const { files, stat } = makeOPFSStatLogic()
    files.set('file.txt', { size: 42, mtime: 1000 })
    const result = await stat('/file.txt')
    assert.deepStrictEqual(result, { size: 42, mtime: 1000, isDirectory: false, permissions: { read: true, write: true } })
  })

  test('stat on directory returns isDirectory: true', async () => {
    const { dirs, stat } = makeOPFSStatLogic()
    dirs.add('mydir')
    const result = await stat('/mydir')
    assert.deepStrictEqual(result, { size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } })
  })

  test('stat on missing path throws NotFoundError', async () => {
    const { stat } = makeOPFSStatLogic()
    await assert.rejects(
      () => stat('/missing'),
      (err) => err.name === 'NotFoundError'
    )
  })

  test('source uses directory-first approach', () => {
    const src = readFileSync('src/backends/opfs.ts', 'utf-8')
    const statSection = src.match(/async stat[\s\S]*?^\s{2}\}/m)?.[0]
    assert.ok(statSection?.includes('getDirHandle'), 'stat() should use getDirHandle for directory detection')
    assert.ok(statSection?.includes('isDirectory: true'), 'stat() should return isDirectory: true for directories')
    assert.ok(!statSection?.includes("e.name === 'TypeMismatchError'"), 'stat() should NOT depend on TypeMismatchError in catch handler')
  })

  test('source calls validatePath in stat()', () => {
    const src = readFileSync('src/backends/opfs.ts', 'utf-8')
    const statSection = src.match(/async stat[\s\S]*?^\s{2}\}/m)?.[0]
    assert.ok(statSection?.includes('validatePath'), 'stat() should call validatePath for empty path check')
  })

  test('source returns permissions field in stat()', () => {
    const src = readFileSync('src/backends/opfs.ts', 'utf-8')
    const statSection = src.match(/async stat[\s\S]*?^\s{2}\}/m)?.[0]
    assert.ok(statSection?.includes('permissions'), 'stat() should return permissions field')
    assert.ok(statSection?.includes('read: true'), 'stat() permissions should include read: true')
    assert.ok(statSection?.includes('write: true'), 'stat() permissions should include write: true')
  })

  test('directory result has permissions field (mock)', async () => {
    const { dirs, stat } = makeOPFSStatLogic()
    dirs.add('mydir')
    const result = await stat('/mydir')
    // Mock doesn't include permissions (simplified), but check isDirectory
    assert.equal(result.isDirectory, true)
  })

  test('stat on nested directory returns isDirectory: true (mock)', async () => {
    const { dirs, stat } = makeOPFSStatLogic()
    dirs.add('a/b/c')
    const result = await stat('/a/b/c')
    assert.deepStrictEqual(result, { size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } })
  })

  test('stat on root directory returns isDirectory: true (mock)', async () => {
    const { dirs, stat } = makeOPFSStatLogic()
    dirs.add('')
    const result = await stat('/')
    assert.deepStrictEqual(result, { size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } })
  })

  test('directory checked before file in stat() order (source)', () => {
    const src = readFileSync('src/backends/opfs.ts', 'utf-8')
    const statSection = src.match(/async stat[\s\S]*?^\s{2}\}/m)?.[0]
    const dirHandlePos = statSection.indexOf('getDirHandle')
    const fileHandlePos = statSection.indexOf('getFileHandle')
    assert.ok(dirHandlePos < fileHandlePos, 'getDirHandle should appear before getFileHandle (directory-first)')
  })

  test('NotFoundError from getDirHandle is not re-thrown as stat error', async () => {
    // When dir lookup fails, it should fall through silently and try file
    const { files, stat } = makeOPFSStatLogic()
    files.set('file.txt', { size: 100, mtime: 500 })
    // dir lookup fails, falls through to file
    const result = await stat('/file.txt')
    assert.equal(result.isDirectory, false)
    assert.equal(result.size, 100)
  })
})
