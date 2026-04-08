import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeFsBackend } from '../../dist/index.js'

describe('NodeFsBackend', () => {
  let dir, backend

  before(() => {
    dir = mkdtempSync(join(tmpdir(), 'afs-nodefs-'))
    backend = new NodeFsBackend(dir)
  })

  after(() => rmSync(dir, { recursive: true }))

  it('set and get round-trip', async () => {
    await backend.set('/hello.txt', 'world')
    assert.equal(await backend.get('/hello.txt'), 'world')
  })

  it('get missing returns null', async () => {
    assert.equal(await backend.get('/does-not-exist.txt'), null)
  })

  it('set creates nested directories', async () => {
    await backend.set('/deep/nested/dir/file.txt', 'deep content')
    assert.equal(await backend.get('/deep/nested/dir/file.txt'), 'deep content')
  })

  it('delete removes file', async () => {
    await backend.set('/to-delete.txt', 'gone')
    await backend.delete('/to-delete.txt')
    assert.equal(await backend.get('/to-delete.txt'), null)
  })

  it('delete missing does not throw', async () => {
    await assert.doesNotReject(() => backend.delete('/no-such-file.txt'))
  })

  it('list returns all files', async () => {
    const b = new NodeFsBackend(mkdtempSync(join(tmpdir(), 'afs-list-')))
    await b.set('/a.txt', '1')
    await b.set('/b.txt', '2')
    const paths = await b.list()
    assert.ok(paths.includes('/a.txt'))
    assert.ok(paths.includes('/b.txt'))
    rmSync(b.root, { recursive: true })
  })

  it('list with prefix filters results', async () => {
    const b = new NodeFsBackend(mkdtempSync(join(tmpdir(), 'afs-prefix-')))
    await b.set('/dir/x.txt', '1')
    await b.set('/other/y.txt', '2')
    const paths = await b.list('/dir')
    assert.ok(paths.includes('/dir/x.txt'))
    assert.ok(!paths.includes('/other/y.txt'))
    rmSync(b.root, { recursive: true })
  })

  it('scan finds matching content', async () => {
    await backend.set('/scan-target.txt', 'line1\nhello world\nline3')
    const results = await backend.scan('hello')
    assert.ok(results.some(r => r.path === '/scan-target.txt' && r.content === 'hello world'))
  })

  it('scan returns empty for no match', async () => {
    assert.deepEqual(await backend.scan('zzznomatchzzz'), [])
  })

  it('scanStream yields matching lines', async () => {
    await backend.set('/stream-src.txt', 'alpha\nbeta search\ngamma')
    const results = []
    for await (const r of backend.scanStream('search')) results.push(r)
    assert.equal(results.length, 1)
    assert.equal(results[0].content, 'beta search')
    assert.equal(results[0].line, 2)
  })

  it('batchGet returns multiple files', async () => {
    await backend.set('/batch1.txt', 'one')
    await backend.set('/batch2.txt', 'two')
    const result = await backend.batchGet(['/batch1.txt', '/batch2.txt', '/batch-missing.txt'])
    assert.equal(result['/batch1.txt'], 'one')
    assert.equal(result['/batch2.txt'], 'two')
    assert.equal(result['/batch-missing.txt'], null)
  })

  it('batchSet writes multiple files', async () => {
    await backend.batchSet({ '/bs-a.txt': 'A', '/bs-b.txt': 'B' })
    assert.equal(await backend.get('/bs-a.txt'), 'A')
    assert.equal(await backend.get('/bs-b.txt'), 'B')
  })

  it('stat returns file metadata', async () => {
    await backend.set('/stat-test.txt', 'hello')
    const s = await backend.stat('/stat-test.txt')
    assert.equal(s.isDirectory, false)
    assert.ok(s.size >= 5)
    assert.ok(typeof s.mtime === 'number')
    assert.ok(s.mtime > 0)
    assert.deepEqual(typeof s.permissions.read, 'boolean')
    assert.deepEqual(typeof s.permissions.write, 'boolean')
  })

  it('stat throws NotFoundError for missing file', async () => {
    await assert.rejects(
      () => backend.stat('/stat-missing.txt'),
      (err) => err.name === 'NotFoundError'
    )
  })

  it('stat with empty path throws IOError', async () => {
    await assert.rejects(
      () => backend.stat(''),
      (err) => err.name === 'IOError'
    )
  })

  it('empty path throws on get', async () => {
    await assert.rejects(() => backend.get(''), /Path cannot be empty/)
  })

  it('empty path throws on set', async () => {
    await assert.rejects(() => backend.set('', 'x'), /Path cannot be empty/)
  })

  it('empty path throws on delete', async () => {
    await assert.rejects(() => backend.delete(''), /Path cannot be empty/)
  })

  it('overwrite updates existing file', async () => {
    await backend.set('/overwrite.txt', 'original')
    await backend.set('/overwrite.txt', 'updated')
    assert.equal(await backend.get('/overwrite.txt'), 'updated')
  })

  it('handles special characters in content', async () => {
    const special = 'tabs\there "quotes" and \'apostrophes\' and\nnewlines'
    await backend.set('/special.txt', special)
    assert.equal(await backend.get('/special.txt'), special)
  })

  it('handles unicode content', async () => {
    const unicode = '你好世界 🚀 émojis'
    await backend.set('/unicode.txt', unicode)
    assert.equal(await backend.get('/unicode.txt'), unicode)
  })
})
