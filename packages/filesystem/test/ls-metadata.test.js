// Tests for task-1775532383428: LsResult metadata (size, mtime)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticFileSystem, NodeFsBackend, AgenticStoreBackend } from '../dist/index.js'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

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

test('NodeFsBackend: ls() returns size and mtime for files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'agentic-meta-'))
  try {
    const fs = new AgenticFileSystem({ storage: new NodeFsBackend(dir) })
    await fs.write('/hello.txt', 'hello world')
    const results = await fs.ls()
    const file = results.find(r => r.name === '/hello.txt')
    assert.ok(file, 'file entry must exist')
    assert.ok(file.size > 0, `size should be > 0, got ${file.size}`)
    assert.ok(typeof file.mtime === 'number', `mtime should be a number, got ${file.mtime}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('AgenticStoreBackend: ls() returns results with stat metadata', async () => {
  const fs = new AgenticFileSystem({ storage: new AgenticStoreBackend(makeMemStore()) })
  await fs.write('/a.txt', 'data')
  const results = await fs.ls()
  assert.ok(results.length > 0)
  assert.ok(typeof results[0].size === 'number')
})
