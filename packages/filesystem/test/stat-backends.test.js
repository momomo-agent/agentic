// Tests for task-1775558752316: stat() on AgenticStoreBackend
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticStoreBackend } from '../dist/index.js'

function makeMemStore() {
  const data = new Map()
  return {
    async get(k) { return data.get(k) ?? undefined },
    async set(k, v) { data.set(k, v) },
    async delete(k) { data.delete(k) },
    async keys() { return [...data.keys()] },
    async has(k) { return data.has(k) },
  }
}

test('AgenticStoreBackend: stat() exists as a method', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  assert.equal(typeof backend.stat, 'function', 'stat() must be a function')
})

test('AgenticStoreBackend: stat() returns size and mtime for existing file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/test.txt', 'hello')
  const meta = await backend.stat('/test.txt')
  assert.ok(meta !== null, 'stat() must return non-null for existing file')
  assert.equal(meta.size, 5, 'size must be 5 bytes for "hello"')
  assert.ok(typeof meta.mtime === 'number' && meta.mtime > 0, 'mtime must be a positive number')
})

test('AgenticStoreBackend: stat() throws NotFoundError for missing file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await assert.rejects(
    () => backend.stat('/nonexistent.txt'),
    (err) => err.name === 'NotFoundError'
  )
})

test('AgenticStoreBackend: stat() handles UTF-8 correctly', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/test.txt', '你好世界') // 12 bytes in UTF-8
  const meta = await backend.stat('/test.txt')
  assert.ok(meta !== null)
  assert.equal(meta.size, 12, 'size must be 12 bytes for UTF-8 string')
})

test('AgenticStoreBackend: stat() handles empty file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/empty.txt', '')
  const meta = await backend.stat('/empty.txt')
  assert.ok(meta !== null)
  assert.equal(meta.size, 0)
})
