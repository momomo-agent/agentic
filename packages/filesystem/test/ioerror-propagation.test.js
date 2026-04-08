// DBB-001: IOError thrown on raw I/O failures in all backends
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { NodeFsBackend, AgenticStoreBackend } from '../dist/index.js'
import { IOError } from '../dist/index.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// --- NodeFsBackend ---
describe('NodeFsBackend IOError propagation', () => {
  test('get() throws IOError on EISDIR (not ENOENT)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'nfs-'))
    const backend = new NodeFsBackend(tmp)
    try {
      // '/' maps to the root dir itself — reading a dir throws EISDIR
      await assert.rejects(() => backend.get('/'), IOError)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  test('get() returns null on ENOENT (no regression)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'nfs-'))
    const backend = new NodeFsBackend(tmp)
    try {
      const result = await backend.get('/nonexistent.txt')
      assert.strictEqual(result, null)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  test('set() throws IOError on write failure', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'nfs-'))
    const backend = new NodeFsBackend(tmp)
    try {
      // Write a file, then try to set() a path that treats it as a directory
      await backend.set('/file.txt', 'content')
      // Writing to a path inside a file (not a dir) causes ENOTDIR
      await assert.rejects(() => backend.set('/file.txt/child.txt', 'x'), IOError)
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })

  test('delete() returns silently on ENOENT (no regression)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'nfs-'))
    const backend = new NodeFsBackend(tmp)
    try {
      await assert.doesNotReject(() => backend.delete('/nonexistent.txt'))
    } finally {
      await rm(tmp, { recursive: true, force: true })
    }
  })
})

// --- AgenticStoreBackend ---
describe('AgenticStoreBackend IOError propagation', () => {
  function makeThrowingStore() {
    return {
      async get() { throw new Error('store failure') },
      async set() { throw new Error('store failure') },
      async delete() { throw new Error('store failure') },
      async keys() { throw new Error('store failure') },
      async has() { throw new Error('store failure') },
    }
  }

  test('get() throws IOError when store throws', async () => {
    const backend = new AgenticStoreBackend(makeThrowingStore())
    await assert.rejects(() => backend.get('/key'), IOError)
  })

  test('set() throws IOError when store throws', async () => {
    const backend = new AgenticStoreBackend(makeThrowingStore())
    await assert.rejects(() => backend.set('/key', 'val'), IOError)
  })

  test('delete() throws IOError when store throws', async () => {
    const backend = new AgenticStoreBackend(makeThrowingStore())
    await assert.rejects(() => backend.delete('/key'), IOError)
  })

  test('list() throws IOError when store throws', async () => {
    const backend = new AgenticStoreBackend(makeThrowingStore())
    await assert.rejects(() => backend.list(), IOError)
  })

  test('get() returns null when store returns null (no regression)', async () => {
    const data = new Map()
    const store = {
      async get(k) { return data.get(k) ?? null },
      async set(k, v) { data.set(k, v) },
      async delete(k) { data.delete(k) },
      async keys() { return [...data.keys()] },
      async has(k) { return data.has(k) },
    }
    const backend = new AgenticStoreBackend(store)
    assert.strictEqual(await backend.get('/missing'), null)
  })
})
