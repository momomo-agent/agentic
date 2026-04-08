// Tests for task-1775532372624: ShellFS exported from index
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ShellFS, AgenticFileSystem, AgenticStoreBackend } from '../dist/index.js'

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

test('ShellFS is exported from index', () => {
  assert.ok(ShellFS)
  assert.equal(typeof ShellFS, 'function')
})

test('ShellFS can be instantiated with AgenticFileSystem', () => {
  const fs = new AgenticFileSystem({ storage: new AgenticStoreBackend(makeMemStore()) })
  assert.ok(new ShellFS(fs))
})
