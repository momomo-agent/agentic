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
  const dir = mkdtempSync(join(tmpdir(), 'afs-ss-'))
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
  test(`${name}: scanStream yields same results as scan`, async () => {
    await backend.set('/stream-a', 'hello world')
    await backend.set('/stream-b', 'goodbye world')
    const scanResults = await backend.scan('world')
    const streamResults = []
    if (typeof backend.scanStream === 'function') {
      for await (const r of backend.scanStream('world')) {
        streamResults.push(r)
      }
      // Same number of results
      assert.equal(streamResults.length, scanResults.length, 'scanStream and scan should return same count')
      // Each scan result should have a matching stream result
      for (const sr of scanResults) {
        assert.ok(
          streamResults.some(r => r.path === sr.path && r.line === sr.line && r.content === sr.content),
          `scanStream missing result: ${JSON.stringify(sr)}`
        )
      }
    }
  })

  test(`${name}: scanStream no match yields empty`, async () => {
    if (typeof backend.scanStream === 'function') {
      const results = []
      for await (const r of backend.scanStream('zzznoexist')) {
        results.push(r)
      }
      assert.deepEqual(results, [])
    }
    cleanup()
  })
}
