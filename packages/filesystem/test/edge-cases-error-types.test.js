import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend } from '../dist/index.js'

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

const dir = mkdtempSync(join(tmpdir(), 'afs-edge-err-'))
global.localStorage = makeMockLocalStorage()

const backends = [
  { name: 'NodeFsBackend',       backend: new NodeFsBackend(dir),                 cleanup: () => rmSync(dir, { recursive: true }) },
  { name: 'AgenticStoreBackend', backend: new AgenticStoreBackend(makeMemStore()), cleanup: () => {} },
  { name: 'MemoryStorage',       backend: new MemoryStorage(),                     cleanup: () => {} },
  { name: 'LocalStorageBackend', backend: new LocalStorageBackend(),               cleanup: () => {} },
]

for (const { name, backend, cleanup } of backends) {
  test(`${name}: set empty path throws IOError`, async () => {
    await assert.rejects(
      () => backend.set('', 'v'),
      (err) => {
        assert.equal(err.name, 'IOError', `${name} should throw IOError for empty path, got ${err.name}`)
        return true
      }
    )
  })

  test(`${name}: get empty path throws IOError`, async () => {
    await assert.rejects(
      () => backend.get(''),
      (err) => {
        assert.equal(err.name, 'IOError', `${name} should throw IOError for empty path, got ${err.name}`)
        return true
      }
    )
  })

  test(`${name}: delete empty path throws IOError`, async () => {
    await assert.rejects(
      () => backend.delete(''),
      (err) => {
        assert.equal(err.name, 'IOError', `${name} should throw IOError for empty path, got ${err.name}`)
        return true
      }
    )
  })

  test(`${name}: dot-only filename`, async () => {
    // '.' is reserved on NodeFsBackend (filesystem constraint), should throw IOError
    if (name === 'NodeFsBackend') {
      await assert.rejects(() => backend.set('/.', 'dot'), (err) => {
        assert.equal(err.name, 'IOError')
        return true
      })
    } else {
      await backend.set('/.', 'dot')
      assert.equal(await backend.get('/.'), 'dot')
    }
  })

  test(`${name}: double-dot filename`, async () => {
    // '..' is reserved on NodeFsBackend (filesystem constraint), should throw IOError
    if (name === 'NodeFsBackend') {
      await assert.rejects(() => backend.set('/..', 'doubledot'), (err) => {
        assert.equal(err.name, 'IOError')
        return true
      })
    } else {
      await backend.set('/..', 'doubledot')
      assert.equal(await backend.get('/..'), 'doubledot')
    }
  })

  test(`${name}: dots in filename`, async () => {
    await backend.set('/a.b.c', 'dots')
    assert.equal(await backend.get('/a.b.c'), 'dots')
  })

  test(`${name}: hidden file (dot prefix)`, async () => {
    await backend.set('/.hidden', 'secret')
    assert.equal(await backend.get('/.hidden'), 'secret')
  })

  test(`${name}: file with multiple extensions`, async () => {
    await backend.set('/archive.tar.gz', 'compressed')
    assert.equal(await backend.get('/archive.tar.gz'), 'compressed')
    cleanup()
  })
}
