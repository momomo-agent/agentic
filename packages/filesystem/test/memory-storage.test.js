import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorage } from '../dist/index.js'

// DBB-008: core contract
test('MemoryStorage: set/get round-trip', async () => {
  const m = new MemoryStorage()
  await m.set('/foo', 'bar')
  assert.equal(await m.get('/foo'), 'bar')
})

test('MemoryStorage: get missing returns null', async () => {
  const m = new MemoryStorage()
  assert.equal(await m.get('/missing'), null)
})

test('MemoryStorage: delete removes key', async () => {
  const m = new MemoryStorage()
  await m.set('/x', 'v')
  await m.delete('/x')
  assert.equal(await m.get('/x'), null)
})

test('MemoryStorage: delete missing is no-op', async () => {
  const m = new MemoryStorage()
  await assert.doesNotReject(() => m.delete('/nope'))
})

test('MemoryStorage: list paths start with /', async () => {
  const m = new MemoryStorage()
  await m.set('/a', '1')
  await m.set('/b', '2')
  const paths = await m.list()
  assert.ok(paths.every(p => p.startsWith('/')))
})

test('MemoryStorage: list with prefix filters correctly', async () => {
  const m = new MemoryStorage()
  await m.set('/docs/a', '1')
  await m.set('/src/b', '2')
  const paths = await m.list('/docs')
  assert.deepEqual(paths, ['/docs/a'])
})

test('MemoryStorage: scan returns correct {path, line, content}', async () => {
  const m = new MemoryStorage()
  await m.set('/file', 'hello world\nfoo bar')
  const results = await m.scan('hello')
  assert.equal(results.length, 1)
  assert.equal(results[0].path, '/file')
  assert.equal(results[0].line, 1)
  assert.equal(results[0].content, 'hello world')
})

test('MemoryStorage: scan no match returns empty', async () => {
  const m = new MemoryStorage()
  await m.set('/file', 'hello')
  assert.deepEqual(await m.scan('xyz'), [])
})

// DBB-009: exported from index.ts
test('MemoryStorage: exported from package', async () => {
  assert.ok(MemoryStorage)
})
