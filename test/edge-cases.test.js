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
  const dir = mkdtempSync(join(tmpdir(), 'afs-edge-'))
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
  test(`${name}: special characters in filename`, async () => {
    await backend.set('/file with spaces', 'v')
    assert.equal(await backend.get('/file with spaces'), 'v')
  })

  test(`${name}: unicode filename`, async () => {
    await backend.set('/日本語.txt', 'u')
    assert.equal(await backend.get('/日本語.txt'), 'u')
  })

  test(`${name}: newline in content`, async () => {
    await backend.set('/nl', 'line1\nline2')
    assert.equal(await backend.get('/nl'), 'line1\nline2')
  })

  test(`${name}: overwrite`, async () => {
    await backend.set('/ow', 'a')
    await backend.set('/ow', 'b')
    assert.equal(await backend.get('/ow'), 'b')
  })

  test(`${name}: concurrent writes same key resolves without error`, async () => {
    await assert.doesNotReject(() => Promise.all([backend.set('/cw', '1'), backend.set('/cw', '2')]))
    const val = await backend.get('/cw')
    assert.ok(val === '1' || val === '2')
  })

  test(`${name}: concurrent independent writes`, async () => {
    await Promise.all([backend.set('/p1', 'a'), backend.set('/p2', 'b')])
    assert.equal(await backend.get('/p1'), 'a')
    assert.equal(await backend.get('/p2'), 'b')
  })

  test(`${name}: scan multiline`, async () => {
    await backend.set('/m', 'foo\nbar\nbaz')
    const results = await backend.scan('bar')
    assert.ok(results.some(r => r.path === '/m' && r.line === 2 && r.content === 'bar'))
  })

  test(`${name}: list after delete`, async () => {
    await backend.set('/del', 'x')
    await backend.delete('/del')
    const paths = await backend.list()
    assert.ok(!paths.includes('/del'))
  })

  test(`${name}: empty path rejected`, async () => {
    await assert.rejects(() => backend.set('', 'v'))
  })

  test(`${name}: get empty path rejects or returns null`, async () => {
    const result = await backend.get('').catch(() => null)
    assert.equal(result, null)
  })

  test(`${name}: concurrent writes 10+ files`, async () => {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => backend.set(`/concurrent-${i}`, `v${i}`))
    )
    for (let i = 0; i < 10; i++) {
      assert.equal(await backend.get(`/concurrent-${i}`), `v${i}`)
    }
    cleanup()
  })
}
