import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  AgenticStoreBackend,
  NodeFsBackend,
  MemoryStorage,
  LocalStorageBackend,
  SQLiteBackend,
} from '../dist/index.js'

// Mock localStorage for Node.js
const lsStore = new Map()
global.localStorage = {
  getItem: k => lsStore.get(k) ?? null,
  setItem: (k, v) => lsStore.set(k, v),
  removeItem: k => lsStore.delete(k),
  get length() { return lsStore.size },
  key: i => Array.from(lsStore.keys())[i] ?? null,
  clear: () => lsStore.clear(),
}

// Mock SQLite database for testing
class MockSQLiteDb {
  constructor() {
    this.data = new Map()
  }
  exec() {}
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
        const path = args[0]
        if (sql.includes('SELECT content FROM files')) {
          const row = db.data.get(path)
          return row ? { content: row.content } : undefined
        } else if (sql.includes('SELECT size, mtime FROM files')) {
          const row = db.data.get(path)
          return row ? { size: row.size, mtime: row.mtime } : undefined
        } else if (sql.includes('SELECT path FROM files')) {
          return db.data.has(path) ? { path } : undefined
        }
        return undefined
      },
      all() {
        if (sql.includes('SELECT path FROM files')) {
          return [...db.data.keys()].map(p => ({ path: p }))
        }
        return []
      },
    }
  }
}

function makeMemStore() {
  const data = new Map()
  return {
    async get(k) { return data.get(k) ?? null },
    async set(k, v) { data.set(k, v) },
    async delete(k) { data.delete(k) },
    async keys() { return [...data.keys()] },
    async has(k) { return data.has(k) },
  }
}

describe('m19: stat() returns permissions field', () => {
  describe('AgenticStoreBackend', () => {
    let backend
    before(() => { backend = new AgenticStoreBackend(makeMemStore()) })

    it('stat returns permissions with read and write booleans', async () => {
      await backend.set('/test.txt', 'hello')
      const meta = await backend.stat('/test.txt')
      assert.ok(meta !== null)
      assert.ok('permissions' in meta, 'Missing permissions field')
      assert.equal(meta.permissions.read, true)
      assert.equal(meta.permissions.write, true)
    })

    it('stat throws NotFoundError for missing path', async () => {
      await assert.rejects(
        () => backend.stat('/missing.txt'),
        (err) => err.name === 'NotFoundError'
      )
    })
  })

  describe('NodeFsBackend', () => {
    let backend, dir
    before(async () => {
      dir = await mkdtemp(join(tmpdir(), 'afs-perm-test-'))
      backend = new NodeFsBackend(dir)
      await backend.set('/test.txt', 'hello')
    })
    after(async () => { await rm(dir, { recursive: true, force: true }) })

    it('stat returns permissions from filesystem mode', async () => {
      const meta = await backend.stat('/test.txt')
      assert.ok(meta !== null)
      assert.ok('permissions' in meta, 'Missing permissions field')
      assert.equal(typeof meta.permissions.read, 'boolean')
      assert.equal(typeof meta.permissions.write, 'boolean')
    })

    it('newly created file has read and write permission', async () => {
      const meta = await backend.stat('/test.txt')
      assert.equal(meta.permissions.read, true)
      assert.equal(meta.permissions.write, true)
    })

    it('stat throws NotFoundError for missing path', async () => {
      await assert.rejects(
        () => backend.stat('/missing.txt'),
        (err) => err.name === 'NotFoundError'
      )
    })

    it('read-only file (0o444) shows write: false', async () => {
      await backend.set('/readonly.txt', 'immutable')
      const fullPath = join(dir, 'readonly.txt')
      await chmod(fullPath, 0o444)
      const meta = await backend.stat('/readonly.txt')
      assert.equal(meta.permissions.read, true)
      assert.equal(meta.permissions.write, false)
      // cleanup: restore write permission so after() can delete
      await chmod(fullPath, 0o644)
    })

    it('owner-writable file (0o644) shows both true', async () => {
      await backend.set('/normal.txt', 'editable')
      const fullPath = join(dir, 'normal.txt')
      await chmod(fullPath, 0o644)
      const meta = await backend.stat('/normal.txt')
      assert.equal(meta.permissions.read, true)
      assert.equal(meta.permissions.write, true)
    })
  })

  describe('MemoryStorage', () => {
    let backend
    before(() => { backend = new MemoryStorage() })

    it('has stat method', () => {
      assert.equal(typeof backend.stat, 'function')
    })

    it('stat returns permissions: {read:true, write:true}', async () => {
      await backend.set('/test.txt', 'hello')
      const meta = await backend.stat('/test.txt')
      assert.ok(meta !== null)
      assert.ok('permissions' in meta, 'Missing permissions field')
      assert.equal(meta.permissions.read, true)
      assert.equal(meta.permissions.write, true)
    })

    it('stat throws NotFoundError for missing path', async () => {
      await assert.rejects(
        () => backend.stat('/missing.txt'),
        (err) => err.name === 'NotFoundError'
      )
    })
  })

  describe('LocalStorageBackend', () => {
    let backend
    before(() => {
      lsStore.clear()
      backend = new LocalStorageBackend()
    })

    it('has stat method', () => {
      assert.equal(typeof backend.stat, 'function')
    })

    it('stat returns permissions: {read:true, write:true}', async () => {
      await backend.set('/test.txt', 'hello')
      const meta = await backend.stat('/test.txt')
      assert.ok(meta !== null)
      assert.ok('permissions' in meta, 'Missing permissions field')
      assert.equal(meta.permissions.read, true)
      assert.equal(meta.permissions.write, true)
    })

    it('stat throws NotFoundError for missing path', async () => {
      await assert.rejects(
        () => backend.stat('/missing.txt'),
        (err) => err.name === 'NotFoundError'
      )
    })
  })

  describe('SQLiteBackend', () => {
    let backend
    before(() => {
      backend = new SQLiteBackend(new MockSQLiteDb())
    })

    it('stat returns permissions: {read:true, write:true}', async () => {
      await backend.set('/test.txt', 'hello')
      const meta = await backend.stat('/test.txt')
      assert.ok(meta !== null)
      assert.ok('permissions' in meta, 'Missing permissions field')
      assert.equal(meta.permissions.read, true)
      assert.equal(meta.permissions.write, true)
    })

    it('stat throws NotFoundError for missing path', async () => {
      await assert.rejects(
        () => backend.stat('/missing.txt'),
        (err) => err.name === 'NotFoundError'
      )
    })
  })

  describe('Cross-backend consistency', () => {
    const backends = {}

    before(() => {
      backends.agenticStore = new AgenticStoreBackend(makeMemStore())
      backends.memory = new MemoryStorage()
      backends.sqlite = new SQLiteBackend(new MockSQLiteDb())
    })

    it('all backends return permissions with read and write booleans', async () => {
      for (const [name, backend] of Object.entries(backends)) {
        await backend.set('/consistency.txt', 'test')
        const meta = await backend.stat('/consistency.txt')
        assert.ok(meta !== null, `${name}: stat returned null`)
        assert.ok('permissions' in meta, `${name}: missing permissions field`)
        assert.equal(typeof meta.permissions.read, 'boolean', `${name}: read is not boolean`)
        assert.equal(typeof meta.permissions.write, 'boolean', `${name}: write is not boolean`)
      }
    })

    it('all backends throw NotFoundError for missing paths', async () => {
      for (const [name, backend] of Object.entries(backends)) {
        await assert.rejects(
          () => backend.stat('/does-not-exist.txt'),
          (err) => err.name === 'NotFoundError',
          `${name}: stat should throw NotFoundError for missing path`
        )
      }
    })
  })
})
