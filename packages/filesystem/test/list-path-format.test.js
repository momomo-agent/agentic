// Tests for DBB-003/005: list() paths have leading slash
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticStoreBackend, NodeFsBackend } from '../dist/index.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// In-memory mock for AgenticStore
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

test('AgenticStoreBackend: list() returns paths with leading slash (no-slash write)', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('foo/bar.txt', 'hello')
  const paths = await backend.list()
  assert.ok(paths.every(p => p.startsWith('/')), `All paths must start with /: ${paths}`)
  assert.ok(paths.includes('/foo/bar.txt'))
})

test('AgenticStoreBackend: list() no double slash when path already has leading slash', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/baz.txt', 'world')
  const paths = await backend.list()
  assert.ok(!paths.some(p => p.startsWith('//')), `No double slash: ${paths}`)
  assert.ok(paths.includes('/baz.txt'))
})

test('AgenticStoreBackend: list(prefix) filters by prefix with leading slash', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/foo/a.txt', '1')
  await backend.set('/bar/b.txt', '2')
  const paths = await backend.list('/foo')
  assert.deepEqual(paths, ['/foo/a.txt'])
})

test('NodeFsBackend: list() returns paths with leading slash', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-test-'))
  try {
    const backend = new NodeFsBackend(dir)
    await backend.set('/hello/world.txt', 'content')
    const paths = await backend.list()
    assert.ok(paths.every(p => p.startsWith('/')), `All paths must start with /: ${paths}`)
    assert.ok(paths.includes('/hello/world.txt'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
