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
  const dir = mkdtempSync(join(tmpdir(), 'afs-'))
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
  test(`${name}: stat returns size and isDirectory=false for file`, async () => {
    await backend.set('/stat-test.txt', 'abc')
    const s = await backend.stat?.('/stat-test.txt')
    if (s !== undefined) {
      assert.equal(s.isDirectory, false)
      assert.ok(s.size >= 0)
    }
  })

  test(`${name}: empty path throws`, async () => {
    await assert.rejects(() => backend.get(''), /Path cannot be empty/)
  })


  test(`${name}: get/set`, async () => {
    await backend.set('/a', 'hello')
    assert.equal(await backend.get('/a'), 'hello')
  })

  test(`${name}: get missing returns null`, async () => {
    assert.equal(await backend.get('/missing'), null)
  })

  test(`${name}: delete`, async () => {
    await backend.set('/b', 'x')
    await backend.delete('/b')
    assert.equal(await backend.get('/b'), null)
  })

  test(`${name}: delete missing resolves without error`, async () => {
    await assert.doesNotReject(() => backend.delete('/nope'))
  })

  test(`${name}: list includes set paths`, async () => {
    await backend.set('/c', '1')
    await backend.set('/d', '2')
    const paths = await backend.list()
    assert.ok(paths.includes('/c'))
    assert.ok(paths.includes('/d'))
  })

  test(`${name}: list with prefix`, async () => {
    await backend.set('/foo/a', '1')
    await backend.set('/bar/b', '2')
    const paths = await backend.list('/foo')
    assert.ok(paths.includes('/foo/a'))
    assert.ok(!paths.includes('/bar/b'))
  })

  test(`${name}: scan match`, async () => {
    await backend.set('/f', 'hello world')
    const results = await backend.scan('world')
    assert.ok(results.some(r => r.path === '/f' && r.line === 1 && r.content === 'hello world'))
  })

  test(`${name}: batchGet round-trip`, async () => {
    await backend.set('/batch-a', '1')
    await backend.set('/batch-b', '2')
    const result = await backend.batchGet(['/batch-a', '/batch-b', '/batch-missing'])
    assert.equal(result['/batch-a'], '1')
    assert.equal(result['/batch-b'], '2')
    assert.equal(result['/batch-missing'], null)
  })

  test(`${name}: batchSet round-trip`, async () => {
    await backend.batchSet({ '/batch-x': '10', '/batch-y': '20' })
    assert.equal(await backend.get('/batch-x'), '10')
    assert.equal(await backend.get('/batch-y'), '20')
  })

  test(`${name}: stat returns size for existing file`, async () => {
    await backend.set('/stat-file', 'hello')
    const s = await backend.stat?.('/stat-file')
    if (s !== undefined) {
      assert.equal(s.isDirectory, false)
      assert.ok(s.size >= 5)
      assert.ok(typeof s.mtime === 'number')
      assert.ok(s.permissions !== undefined, 'stat should include permissions')
      assert.equal(typeof s.permissions.read, 'boolean')
      assert.equal(typeof s.permissions.write, 'boolean')
    }
  })

  test(`${name}: stat throws NotFoundError for missing file`, async () => {
    if (backend.stat) {
      await assert.rejects(
        () => backend.stat('/stat-missing'),
        (err) => err.name === 'NotFoundError'
      )
    }
  })

  test(`${name}: stat with empty path throws IOError`, async () => {
    if (backend.stat) {
      await assert.rejects(
        () => backend.stat(''),
        (err) => err.name === 'IOError'
      )
    }
  })

  test(`${name}: scan no match`, async () => {
    assert.deepEqual(await backend.scan('zzznomatch'), [])
    cleanup()
  })
}
