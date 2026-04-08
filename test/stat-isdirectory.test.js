import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticStoreBackend } from '../dist/index.js'

function makeStore() {
  const data = new Map()
  return {
    async get(k) { return data.get(k) ?? undefined },
    async set(k, v) { data.set(k, v) },
    async delete(k) { data.delete(k) },
    async list(prefix) { return [...data.keys()].filter(k => k.startsWith(prefix)) }
  }
}

test('AgenticStoreBackend stat() returns isDirectory: false for existing file (DBB-001)', async () => {
  const backend = new AgenticStoreBackend(makeStore())
  await backend.set('/file.txt', 'hello')
  const result = await backend.stat('/file.txt')
  assert.ok(result !== null)
  assert.equal(result.isDirectory, false)
  assert.equal(typeof result.size, 'number')
  assert.equal(typeof result.mtime, 'number')
})

test('AgenticStoreBackend stat() throws NotFoundError for missing path (DBB-002)', async () => {
  const backend = new AgenticStoreBackend(makeStore())
  await assert.rejects(
    () => backend.stat('/nonexistent'),
    (err) => err.name === 'NotFoundError'
  )
})
