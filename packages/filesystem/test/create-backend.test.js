// Test createBackend() auto-selection
import { test } from 'node:test'
import assert from 'node:assert'
import { createBackend, createDefaultBackend, NodeFsBackend } from '../dist/index.js'

test('createBackend() returns NodeFsBackend in Node.js environment', async () => {
  const backend = await createBackend()
  assert.ok(backend instanceof NodeFsBackend, 'Should return NodeFsBackend instance')
})

test('createBackend() accepts rootDir option', async () => {
  const backend = await createBackend({ rootDir: '/tmp/test' })
  assert.ok(backend instanceof NodeFsBackend, 'Should return NodeFsBackend instance')
  // Verify it can perform operations
  await backend.set('/test.txt', 'hello')
  const content = await backend.get('/test.txt')
  assert.strictEqual(content, 'hello')
  await backend.delete('/test.txt')
})

test('createBackend() is exported from package', async () => {
  const { createBackend: exported } = await import('../dist/index.js')
  assert.strictEqual(typeof exported, 'function', 'createBackend should be exported')
})

test('createDefaultBackend() returns NodeFsBackend in Node.js', async () => {
  const backend = await createDefaultBackend()
  assert.ok(backend instanceof NodeFsBackend)
})

test('createDefaultBackend() is exported from package', async () => {
  const { createDefaultBackend: fn } = await import('../dist/index.js')
  assert.strictEqual(typeof fn, 'function')
})
