import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

// Mock localStorage for Node.js
const store = new Map()
let throwOnNext = null
global.localStorage = {
  getItem: k => { if (throwOnNext === 'getItem') throw new Error('simulated failure'); return store.get(k) ?? null },
  setItem: (k, v) => { if (throwOnNext === 'setItem') throw new Error('simulated failure'); store.set(k, v) },
  removeItem: k => { if (throwOnNext === 'removeItem') throw new Error('simulated failure'); store.delete(k) },
  get length() { return store.size },
  key: i => Array.from(store.keys())[i] ?? null,
  clear: () => store.clear()
}

const { LocalStorageBackend, IOError } = await import('../dist/index.js')

describe('LocalStorageBackend error handling', () => {
  test.beforeEach(() => { store.clear(); throwOnNext = null })

  test('get() throws IOError when localStorage.getItem throws', async () => {
    const b = new LocalStorageBackend()
    throwOnNext = 'getItem'
    await assert.rejects(() => b.get('/test'), IOError)
  })

  test('set() throws IOError when localStorage.setItem throws', async () => {
    const b = new LocalStorageBackend()
    throwOnNext = 'setItem'
    await assert.rejects(() => b.set('/test', 'content'), IOError)
  })

  test('delete() throws IOError when localStorage.removeItem throws', async () => {
    const b = new LocalStorageBackend()
    throwOnNext = 'removeItem'
    await assert.rejects(() => b.delete('/test'), IOError)
  })

  test('IOError is not double-wrapped when storage() throws', async () => {
    const saved = global.localStorage
    delete global.localStorage
    const b = new LocalStorageBackend()
    try {
      await assert.rejects(
        () => b.get('/x'),
        (e) => {
          assert.ok(e instanceof IOError)
          // Should not contain "Failed to read" wrapper — direct IOError from storage()
          assert.ok(e.message.includes('localStorage not available'))
          return true
        }
      )
    } finally {
      global.localStorage = saved
    }
  })

  test('normal operations still work after adding error handling', async () => {
    const b = new LocalStorageBackend()
    await b.set('/a', 'hello')
    assert.equal(await b.get('/a'), 'hello')
    await b.delete('/a')
    assert.equal(await b.get('/a'), null)
    assert.deepEqual(await b.list(), [])
  })
})
