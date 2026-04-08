// test/batch-operations.test.js — Tests for batchGet and batchSet operations

import { test } from 'node:test'
import assert from 'node:assert'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NodeFsBackend, AgenticStoreBackend } from '../dist/index.js'

// Mock AgenticStore for testing
class MockAgenticStore {
  constructor() {
    this.data = new Map()
  }
  async get(key) {
    return this.data.get(key) ?? null
  }
  async set(key, value) {
    this.data.set(key, value)
  }
  async delete(key) {
    this.data.delete(key)
  }
  async keys() {
    return Array.from(this.data.keys())
  }
  async has(key) {
    return this.data.has(key)
  }
}

// DBB-011: batchGet returns null for missing paths
test('NodeFsBackend: batchGet returns null for missing paths', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'afs-test-'))
  const backend = new NodeFsBackend(tmpDir)

  await backend.set('/exists', 'content here')

  const result = await backend.batchGet(['/exists', '/missing'])

  assert.strictEqual(result['/exists'], 'content here')
  assert.strictEqual(result['/missing'], null)

  await rm(tmpDir, { recursive: true })
})

test('AgenticStoreBackend: batchGet returns null for missing paths', async () => {
  const store = new MockAgenticStore()
  const backend = new AgenticStoreBackend(store)

  await backend.set('/exists', 'content here')

  const result = await backend.batchGet(['/exists', '/missing'])

  assert.strictEqual(result['/exists'], 'content here')
  assert.strictEqual(result['/missing'], null)
})

// DBB-012: batchSet writes all entries
test('NodeFsBackend: batchSet writes all entries', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'afs-test-'))
  const backend = new NodeFsBackend(tmpDir)

  await backend.batchSet({ '/x': 'v1', '/y': 'v2' })

  const result = await backend.batchGet(['/x', '/y'])

  assert.strictEqual(result['/x'], 'v1')
  assert.strictEqual(result['/y'], 'v2')

  await rm(tmpDir, { recursive: true })
})

test('AgenticStoreBackend: batchSet writes all entries', async () => {
  const store = new MockAgenticStore()
  const backend = new AgenticStoreBackend(store)

  await backend.batchSet({ '/x': 'v1', '/y': 'v2' })

  const result = await backend.batchGet(['/x', '/y'])

  assert.strictEqual(result['/x'], 'v1')
  assert.strictEqual(result['/y'], 'v2')
})

// Edge case: empty arrays and objects
test('NodeFsBackend: batchGet with empty array returns empty object', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'afs-test-'))
  const backend = new NodeFsBackend(tmpDir)

  const result = await backend.batchGet([])

  assert.deepStrictEqual(result, {})

  await rm(tmpDir, { recursive: true })
})

test('AgenticStoreBackend: batchGet with empty array returns empty object', async () => {
  const store = new MockAgenticStore()
  const backend = new AgenticStoreBackend(store)

  const result = await backend.batchGet([])

  assert.deepStrictEqual(result, {})
})

test('NodeFsBackend: batchSet with empty object completes without error', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'afs-test-'))
  const backend = new NodeFsBackend(tmpDir)

  await backend.batchSet({})

  // Should complete without throwing
  assert.ok(true)

  await rm(tmpDir, { recursive: true })
})

test('AgenticStoreBackend: batchSet with empty object completes without error', async () => {
  const store = new MockAgenticStore()
  const backend = new AgenticStoreBackend(store)

  await backend.batchSet({})

  // Should complete without throwing
  assert.ok(true)
})

// Multiple paths with mixed existence
test('NodeFsBackend: batchGet with multiple paths, some missing', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'afs-test-'))
  const backend = new NodeFsBackend(tmpDir)

  await backend.set('/a', 'content a')
  await backend.set('/c', 'content c')

  const result = await backend.batchGet(['/a', '/b', '/c', '/d'])

  assert.strictEqual(result['/a'], 'content a')
  assert.strictEqual(result['/b'], null)
  assert.strictEqual(result['/c'], 'content c')
  assert.strictEqual(result['/d'], null)

  await rm(tmpDir, { recursive: true })
})

test('AgenticStoreBackend: batchGet with multiple paths, some missing', async () => {
  const store = new MockAgenticStore()
  const backend = new AgenticStoreBackend(store)

  await backend.set('/a', 'content a')
  await backend.set('/c', 'content c')

  const result = await backend.batchGet(['/a', '/b', '/c', '/d'])

  assert.strictEqual(result['/a'], 'content a')
  assert.strictEqual(result['/b'], null)
  assert.strictEqual(result['/c'], 'content c')
  assert.strictEqual(result['/d'], null)
})

// Batch operations with nested paths
test('NodeFsBackend: batchSet creates nested directories', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'afs-test-'))
  const backend = new NodeFsBackend(tmpDir)

  await backend.batchSet({
    '/dir1/file1': 'content1',
    '/dir2/subdir/file2': 'content2'
  })

  const result = await backend.batchGet(['/dir1/file1', '/dir2/subdir/file2'])

  assert.strictEqual(result['/dir1/file1'], 'content1')
  assert.strictEqual(result['/dir2/subdir/file2'], 'content2')

  await rm(tmpDir, { recursive: true })
})

test('AgenticStoreBackend: batchSet with nested paths', async () => {
  const store = new MockAgenticStore()
  const backend = new AgenticStoreBackend(store)

  await backend.batchSet({
    '/dir1/file1': 'content1',
    '/dir2/subdir/file2': 'content2'
  })

  const result = await backend.batchGet(['/dir1/file1', '/dir2/subdir/file2'])

  assert.strictEqual(result['/dir1/file1'], 'content1')
  assert.strictEqual(result['/dir2/subdir/file2'], 'content2')
})

// Overwrite existing files with batchSet
test('NodeFsBackend: batchSet overwrites existing files', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'afs-test-'))
  const backend = new NodeFsBackend(tmpDir)

  await backend.set('/file', 'old content')
  await backend.batchSet({ '/file': 'new content' })

  const result = await backend.get('/file')

  assert.strictEqual(result, 'new content')

  await rm(tmpDir, { recursive: true })
})

test('AgenticStoreBackend: batchSet overwrites existing files', async () => {
  const store = new MockAgenticStore()
  const backend = new AgenticStoreBackend(store)

  await backend.set('/file', 'old content')
  await backend.batchSet({ '/file': 'new content' })

  const result = await backend.get('/file')

  assert.strictEqual(result, 'new content')
})
