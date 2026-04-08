import { test } from 'node:test'
import assert from 'node:assert/strict'

// Mock localStorage for Node.js
const store = new Map()
global.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, v),
  removeItem: k => store.delete(k),
  get length() { return store.size },
  key: i => Array.from(store.keys())[i] ?? null,
  clear: () => store.clear()
}

const { LocalStorageBackend } = await import('../dist/index.js')

test.beforeEach(() => store.clear())

test('LocalStorageBackend: set/get round-trip', async () => {
  const b = new LocalStorageBackend()
  await b.set('/a', 'hello')
  assert.equal(await b.get('/a'), 'hello')
})

test('LocalStorageBackend: get missing returns null', async () => {
  const b = new LocalStorageBackend()
  assert.equal(await b.get('/missing'), null)
})

test('LocalStorageBackend: delete removes key', async () => {
  const b = new LocalStorageBackend()
  await b.set('/a', 'x')
  await b.delete('/a')
  assert.equal(await b.get('/a'), null)
})

test('LocalStorageBackend: delete missing is no-op', async () => {
  const b = new LocalStorageBackend()
  await assert.doesNotReject(() => b.delete('/nope'))
})

test('LocalStorageBackend: list paths start with /', async () => {
  const b = new LocalStorageBackend()
  await b.set('/foo', '1')
  await b.set('/bar', '2')
  const paths = await b.list()
  assert.ok(paths.every(p => p.startsWith('/')))
})

test('LocalStorageBackend: list with prefix filters correctly', async () => {
  const b = new LocalStorageBackend()
  await b.set('/dir/a', '1')
  await b.set('/other/b', '2')
  const paths = await b.list('/dir')
  assert.deepEqual(paths, ['/dir/a'])
})

test('LocalStorageBackend: scan returns correct {path, line, content}', async () => {
  const b = new LocalStorageBackend()
  await b.set('/f', 'hello world\nfoo bar')
  const results = await b.scan('hello')
  assert.equal(results.length, 1)
  assert.equal(results[0].path, '/f')
  assert.equal(results[0].line, 1)
  assert.equal(results[0].content, 'hello world')
})

test('LocalStorageBackend: scan no match returns empty', async () => {
  const b = new LocalStorageBackend()
  await b.set('/f', 'nothing here')
  assert.deepEqual(await b.scan('zzz'), [])
})

test('LocalStorageBackend: batchGet returns null for missing', async () => {
  const b = new LocalStorageBackend()
  await b.set('/exists', 'v')
  const result = await b.batchGet(['/exists', '/missing'])
  assert.deepEqual(result, { '/exists': 'v', '/missing': null })
})

test('LocalStorageBackend: batchSet writes all entries', async () => {
  const b = new LocalStorageBackend()
  await b.batchSet({ '/x': 'v1', '/y': 'v2' })
  const result = await b.batchGet(['/x', '/y'])
  assert.deepEqual(result, { '/x': 'v1', '/y': 'v2' })
})

test('LocalStorageBackend: exported from package', async () => {
  const mod = await import('../dist/index.js')
  assert.ok(typeof mod.LocalStorageBackend === 'function')
})

test('LocalStorageBackend: throws when localStorage unavailable', async () => {
  const saved = global.localStorage
  delete global.localStorage
  const b = new LocalStorageBackend()
  await assert.rejects(() => b.get('/x'), /localStorage not available/)
  global.localStorage = saved
})
