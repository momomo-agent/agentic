// Tests for task-1775531687208: Typed error classes
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NotFoundError, PermissionDeniedError, IOError, AgenticFileSystem, NodeFsBackend } from '../dist/index.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('NotFoundError is an Error with correct name', () => {
  const e = new NotFoundError('/foo')
  assert.ok(e instanceof Error)
  assert.equal(e.name, 'NotFoundError')
  assert.ok(e.message.includes('/foo'))
})

test('PermissionDeniedError is an Error with correct name', () => {
  const e = new PermissionDeniedError()
  assert.ok(e instanceof Error)
  assert.equal(e.name, 'PermissionDeniedError')
})

test('IOError is an Error with correct name', () => {
  const e = new IOError('disk full')
  assert.ok(e instanceof Error)
  assert.equal(e.name, 'IOError')
  assert.equal(e.message, 'disk full')
})

test('AgenticFileSystem.read returns error string for missing file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-err-'))
  try {
    const fs = new AgenticFileSystem({ storage: new NodeFsBackend(dir) })
    const r = await fs.read('/nonexistent.txt')
    assert.ok(r.error)
    assert.ok(r.error.includes('nonexistent.txt'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('AgenticFileSystem.write returns error on readOnly fs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-ro-'))
  try {
    const fs = new AgenticFileSystem({ storage: new NodeFsBackend(dir), readOnly: true })
    const r = await fs.write('/x.txt', 'data')
    assert.ok(r.error)
    assert.ok(r.error.toLowerCase().includes('read-only') || r.error.toLowerCase().includes('permission'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
