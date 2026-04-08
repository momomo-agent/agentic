import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticStoreBackend } from '../../dist/index.js'

function makeStore() {
  const data = new Map()
  return {
    async get(k) { return data.get(k) ?? null },
    async set(k, v) { data.set(k, v) },
    async delete(k) { data.delete(k) },
    async keys() { return [...data.keys()] },
    async has(k) { return data.has(k) },
  }
}

describe('AgenticStoreBackend path normalization', () => {
  test('list() normalizes paths without leading slash', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('file1.txt', 'c1')
    await backend.set('dir/file2.txt', 'c2')
    const paths = await backend.list()
    assert.ok(paths.every(p => p.startsWith('/')))
  })

  test('list() preserves paths with leading slash', async () => {
    const store = makeStore()
    await store.set('/file1.txt', 'c1')
    const backend = new AgenticStoreBackend(store)
    const paths = await backend.list()
    assert.deepEqual(paths, ['/file1.txt'])
  })

  test('list() prefix filtering works with normalized paths', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('file1.txt', 'c1')
    await backend.set('dir/file2.txt', 'c2')
    const paths = await backend.list('/dir')
    assert.deepEqual(paths, ['/dir/file2.txt'])
  })

  test('scan() returns normalized paths', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('file1.txt', 'hello world')
    const results = await backend.scan('hello')
    assert.ok(results.every(r => r.path.startsWith('/')))
  })

  test('scan() result structure matches interface', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('test.txt', 'line 1\nline 2 match\nline 3')
    const results = await backend.scan('match')
    assert.equal(results.length, 1)
    assert.deepEqual(results[0], { path: '/test.txt', line: 2, content: 'line 2 match' })
  })

  test('scanStream() yields normalized paths', async () => {
    const backend = new AgenticStoreBackend(makeStore())
    await backend.set('file1.txt', 'hello world')
    const results = []
    for await (const r of backend.scanStream('hello')) results.push(r)
    assert.ok(results.every(r => r.path.startsWith('/')))
  })
})
