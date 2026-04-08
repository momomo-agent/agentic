import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAutoBackend, NodeFsBackend } from '../dist/index.js'

test('createAutoBackend() is exported from package', () => {
  assert.strictEqual(typeof createAutoBackend, 'function')
})

test('createAutoBackend() returns NodeFsBackend in Node.js', async () => {
  const backend = await createAutoBackend({ rootDir: '/tmp/test-auto-backend' })
  assert.ok(backend instanceof NodeFsBackend)
})

test('createAutoBackend() result has required StorageBackend methods', async () => {
  const backend = await createAutoBackend({ rootDir: '/tmp/test-auto-backend' })
  for (const method of ['get', 'set', 'delete', 'list', 'scan']) {
    assert.strictEqual(typeof backend[method], 'function', `missing method: ${method}`)
  }
})
