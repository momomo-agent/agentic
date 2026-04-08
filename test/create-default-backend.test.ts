import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createDefaultBackend, NodeFsBackend, SQLiteBackend } from '../dist/index.js'
import { AgenticStoreBackend } from '../dist/index.js'
import { MemoryStorage } from '../dist/index.js'

describe('createDefaultBackend()', () => {
  it('returns NodeFsBackend in Node.js environment', async () => {
    const backend = await createDefaultBackend()
    assert.ok(backend instanceof NodeFsBackend)
  })

  it('accepts rootDir option passed to NodeFsBackend', async () => {
    const backend = await createDefaultBackend({ rootDir: '/tmp/test-default-backend' })
    assert.ok(backend instanceof NodeFsBackend)
    await backend.set('/probe.txt', 'ok')
    assert.equal(await backend.get('/probe.txt'), 'ok')
    await backend.delete('/probe.txt')
  })

  it('returns backend with required StorageBackend methods', async () => {
    const backend = await createDefaultBackend()
    for (const m of ['get', 'set', 'delete', 'list', 'scan']) {
      assert.equal(typeof (backend as any)[m], 'function', `missing: ${m}`)
    }
  })

  // DBB-003: verify AgenticStoreBackend and MemoryStorage satisfy StorageBackend interface
  // (browser-env selection cannot be tested in Node — process.versions is read-only)
  it('AgenticStoreBackend satisfies StorageBackend interface (IDB branch)', async () => {
    const store = { async get(_k: string) { return null }, async set(_k: string, _v: string) {}, async delete(_k: string) {}, async keys() { return [] }, async has(_k: string) { return false } }
    const backend = new AgenticStoreBackend(store)
    for (const m of ['get', 'set', 'delete', 'list', 'scan', 'stat']) {
      assert.equal(typeof (backend as any)[m], 'function', `missing: ${m}`)
    }
  })

  it('MemoryStorage satisfies StorageBackend interface (fallback branch)', async () => {
    const backend = new MemoryStorage()
    for (const m of ['get', 'set', 'delete', 'list', 'scan']) {
      assert.equal(typeof (backend as any)[m], 'function', `missing: ${m}`)
    }
  })

  it('createBackend({ sqliteDb }) returns SQLiteBackend', async () => {
    const mockDb = {
      exec: () => {},
      prepare: () => ({ run: () => {}, get: () => undefined, all: () => [] as Record<string, unknown>[] }),
    }
    const backend = await createDefaultBackend({ sqliteDb: mockDb })
    assert.ok(backend instanceof SQLiteBackend)
  })

  it('createBackend() without sqliteDb uses auto-selection (NodeFs)', async () => {
    const backend = await createDefaultBackend()
    assert.ok(backend instanceof NodeFsBackend)
  })
})
