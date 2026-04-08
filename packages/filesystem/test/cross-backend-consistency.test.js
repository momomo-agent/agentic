// Cross-backend consistency test suite
// Runs an identical behavioral test matrix against all 5 Node.js-testable backends.
// OPFSBackend is excluded (browser-only).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend, SQLiteBackend } from '../dist/index.js'

function makeMemStore() {
  const m = new Map()
  return {
    get: async k => m.get(k) ?? undefined,
    set: async (k, v) => m.set(k, v),
    delete: async k => m.delete(k),
    keys: async () => [...m.keys()],
    has: async k => m.has(k),
  }
}

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

class MockSQLiteDb {
  constructor() { this.data = new Map(); this.executed = [] }
  exec(sql) { this.executed.push(sql) }
  prepare(sql) {
    const db = this
    return {
      run(...args) {
        if (sql.includes('INSERT OR REPLACE')) {
          const [path, content, size, mtime] = args
          db.data.set(path, { content, size, mtime })
        } else if (sql.includes('DELETE')) {
          db.data.delete(args[0])
        }
      },
      get(...args) {
        if (sql.includes('SELECT content FROM files')) {
          const row = db.data.get(args[0])
          return row ? { content: row.content } : undefined
        } else if (sql.includes('SELECT size, mtime FROM files')) {
          const row = db.data.get(args[0])
          return row ? { size: row.size, mtime: row.mtime } : undefined
        }
      },
      all(...args) {
        if (sql.includes('WHERE path LIKE')) {
          const prefix = args[0].replace(/%$/, '')
          return Array.from(db.data.keys()).filter(p => p.startsWith(prefix)).map(path => ({ path }))
        } else if (sql.includes('SELECT path, content FROM files')) {
          return Array.from(db.data.entries()).map(([path, d]) => ({ path, content: d.content }))
        } else if (sql.includes('SELECT path FROM files')) {
          return Array.from(db.data.keys()).map(path => ({ path }))
        }
        return []
      }
    }
  }
}

function makeBackends() {
  const dir = mkdtempSync(join(tmpdir(), 'afs-consistency-'))
  global.localStorage = makeMockLocalStorage()
  return [
    { name: 'NodeFsBackend',       backend: new NodeFsBackend(dir),                  cleanup: () => rmSync(dir, { recursive: true }) },
    { name: 'AgenticStoreBackend', backend: new AgenticStoreBackend(makeMemStore()),  cleanup: () => {} },
    { name: 'MemoryStorage',       backend: new MemoryStorage(),                      cleanup: () => {} },
    { name: 'LocalStorageBackend', backend: new LocalStorageBackend(),                cleanup: () => {} },
    { name: 'SQLiteBackend',       backend: new SQLiteBackend(new MockSQLiteDb()),    cleanup: () => {} },
  ]
}

for (const { name, backend, cleanup } of makeBackends()) {
  // 1. get/set round-trip
  test(`${name}: get/set round-trip`, async () => {
    await backend.set('/a', 'value-a')
    assert.equal(await backend.get('/a'), 'value-a')
  })

  // 2. get missing returns null
  test(`${name}: get missing returns null`, async () => {
    assert.equal(await backend.get('/missing'), null)
  })

  // 3. delete missing resolves without error
  test(`${name}: delete missing resolves without error`, async () => {
    await assert.doesNotReject(() => backend.delete('/no-such-file'))
  })

  // 4. empty path set throws IOError
  test(`${name}: empty path set throws IOError`, async () => {
    await assert.rejects(
      () => backend.set('', 'val'),
      (err) => err.name === 'IOError'
    )
  })

  // 5. empty path get throws IOError
  test(`${name}: empty path get throws IOError`, async () => {
    await assert.rejects(
      () => backend.get(''),
      (err) => err.name === 'IOError'
    )
  })

  // 6. empty path delete throws IOError
  test(`${name}: empty path delete throws IOError`, async () => {
    await assert.rejects(
      () => backend.delete(''),
      (err) => err.name === 'IOError'
    )
  })

  // 7. empty path stat throws IOError (where stat exists)
  test(`${name}: empty path stat throws IOError`, async () => {
    if (backend.stat) {
      await assert.rejects(
        () => backend.stat(''),
        (err) => err.name === 'IOError'
      )
    }
  })

  // 8. list returns /-prefixed paths
  test(`${name}: list returns /-prefixed paths`, async () => {
    await backend.set('/list-test/x', '1')
    await backend.set('/list-test/y', '2')
    const paths = await backend.list()
    const testPaths = paths.filter(p => p.startsWith('/list-test'))
    assert.ok(testPaths.length >= 2, 'should have at least 2 list-test paths')
    for (const p of testPaths) {
      assert.ok(p.startsWith('/'), `path "${p}" should start with /`)
    }
  })

  // 9. list with prefix filter
  test(`${name}: list with prefix filter`, async () => {
    await backend.set('/prefix-a/file1', '1')
    await backend.set('/prefix-b/file2', '2')
    const aPaths = await backend.list('/prefix-a')
    assert.ok(aPaths.includes('/prefix-a/file1'))
    assert.ok(!aPaths.includes('/prefix-b/file2'))
  })

  // 10. stat fields
  test(`${name}: stat returns { size, mtime, isDirectory, permissions }`, async () => {
    await backend.set('/stat-check', 'hello stat')
    const s = await backend.stat?.('/stat-check')
    if (s !== undefined) {
      assert.equal(s.isDirectory, false)
      assert.ok(typeof s.size === 'number' && s.size >= 0, 'size should be non-negative number')
      assert.ok(typeof s.mtime === 'number', 'mtime should be a number')
      assert.ok(s.permissions !== undefined, 'permissions should exist')
      assert.equal(typeof s.permissions.read, 'boolean')
      assert.equal(typeof s.permissions.write, 'boolean')
    }
  })

  // 11. stat missing throws NotFoundError
  test(`${name}: stat missing throws NotFoundError`, async () => {
    if (backend.stat) {
      await assert.rejects(
        () => backend.stat('/stat-nonexistent'),
        (err) => err.name === 'NotFoundError'
      )
    }
  })

  // 12. batchGet round-trip
  test(`${name}: batchGet round-trip`, async () => {
    await backend.set('/bg-a', 'va')
    await backend.set('/bg-b', 'vb')
    const result = await backend.batchGet(['/bg-a', '/bg-b', '/bg-missing'])
    assert.equal(result['/bg-a'], 'va')
    assert.equal(result['/bg-b'], 'vb')
    assert.equal(result['/bg-missing'], null)
  })

  // 13. batchSet round-trip
  test(`${name}: batchSet round-trip`, async () => {
    await backend.batchSet({ '/bs-x': '100', '/bs-y': '200' })
    assert.equal(await backend.get('/bs-x'), '100')
    assert.equal(await backend.get('/bs-y'), '200')
  })

  // 14. scan match returns { path, line, content }
  test(`${name}: scan match returns { path, line, content }`, async () => {
    await backend.set('/scan-file', 'alpha beta gamma')
    const results = await backend.scan('beta')
    assert.ok(results.length >= 1, 'should find at least one match')
    const match = results.find(r => r.path === '/scan-file')
    assert.ok(match, 'should have match for /scan-file')
    assert.equal(match.line, 1)
    assert.equal(match.content, 'alpha beta gamma')
  })

  // 15. scan no match returns []
  test(`${name}: scan no match returns []`, async () => {
    const results = await backend.scan('zzznoconsistencymatch')
    assert.deepEqual(results, [])
    cleanup()
  })
}
