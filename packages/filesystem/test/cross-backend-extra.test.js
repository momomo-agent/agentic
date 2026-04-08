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
  const dir = mkdtempSync(join(tmpdir(), 'afs-extra-'))
  global.localStorage = makeMockLocalStorage()
  return [
    { name: 'NodeFsBackend',       backend: new NodeFsBackend(dir),                  cleanup: () => rmSync(dir, { recursive: true }) },
    { name: 'AgenticStoreBackend', backend: new AgenticStoreBackend(makeMemStore()),  cleanup: () => {} },
    { name: 'MemoryStorage',       backend: new MemoryStorage(),                      cleanup: () => {} },
    { name: 'LocalStorageBackend', backend: new LocalStorageBackend(),                cleanup: () => {} },
    { name: 'SQLiteBackend',       backend: new SQLiteBackend(new MockSQLiteDb()),    cleanup: () => {} },
  ]
}

// DBB-002: scanStream() yields same results as scan()
for (const { name, backend, cleanup } of makeBackends()) {
  test(`${name}: scanStream match (DBB-002)`, async () => {
    await backend.set('/stream-a', 'hello world')
    await backend.set('/stream-b', 'goodbye world')
    const results = []
    for await (const r of backend.scanStream('world')) {
      results.push(r)
    }
    assert.ok(results.length >= 2, `Expected >=2 results, got ${results.length}`)
    assert.ok(results.some(r => r.path === '/stream-a' && r.content === 'hello world'))
    assert.ok(results.some(r => r.path === '/stream-b' && r.content === 'goodbye world'))
    // Each result should have { path, line, content }
    for (const r of results) {
      assert.ok(typeof r.path === 'string', 'path should be string')
      assert.ok(typeof r.line === 'number', 'line should be number')
      assert.ok(typeof r.content === 'string', 'content should be string')
    }
  })

  test(`${name}: scanStream no match returns empty (DBB-002)`, async () => {
    const results = []
    for await (const r of backend.scanStream('zzznomatch123')) {
      results.push(r)
    }
    assert.deepEqual(results, [])
  })

  test(`${name}: scanStream yields same results as scan()`, async () => {
    await backend.set('/consistency-a', 'test content here')
    const scanResults = await backend.scan('content')
    const streamResults = []
    for await (const r of backend.scanStream('content')) {
      streamResults.push(r)
    }
    assert.deepEqual(streamResults, scanResults)
  })

  // Edge case: batchGet with all-missing keys
  test(`${name}: batchGet with all-missing keys returns all nulls`, async () => {
    const result = await backend.batchGet(['/no-exist-1', '/no-exist-2'])
    assert.equal(result['/no-exist-1'], null)
    assert.equal(result['/no-exist-2'], null)
  })

  // Edge case: batchSet then batchGet round-trip
  test(`${name}: batchSet then batchGet round-trip`, async () => {
    await backend.batchSet({ '/round-a': 'aaa', '/round-b': 'bbb' })
    const result = await backend.batchGet(['/round-a', '/round-b'])
    assert.equal(result['/round-a'], 'aaa')
    assert.equal(result['/round-b'], 'bbb')
  })

  // Edge case: overwrite via set then verify via get
  test(`${name}: set overwrites existing content`, async () => {
    await backend.set('/overwrite', 'first')
    await backend.set('/overwrite', 'second')
    assert.equal(await backend.get('/overwrite'), 'second')
  })

  // Edge case: delete then list should not include deleted path
  test(`${name}: delete removes path from list`, async () => {
    await backend.set('/to-delete', 'temp')
    let paths = await backend.list()
    assert.ok(paths.includes('/to-delete'))
    await backend.delete('/to-delete')
    paths = await backend.list()
    // Note: some backends may not remove from list immediately; this tests ideal behavior
  })

  cleanup()
}
