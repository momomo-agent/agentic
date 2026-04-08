// Tests for task-1775531683476: AgenticStoreBackend.scan() return type
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

test('scan() returns {path,line,content}[] shape', async () => {
  const b = new AgenticStoreBackend(makeMemStore())
  await b.set('/file.txt', 'hello world\nfoo bar')
  const r = await b.scan('hello')
  assert.equal(r.length, 1)
  assert.equal(typeof r[0].path, 'string')
  assert.equal(typeof r[0].line, 'number')
  assert.equal(typeof r[0].content, 'string')
})

test('scan() path has leading slash', async () => {
  const b = new AgenticStoreBackend(makeMemStore())
  await b.set('no-slash.txt', 'match me')
  const r = await b.scan('match me')
  assert.ok(r.every(x => x.path.startsWith('/')))
})

test('scan() line numbers are 1-based', async () => {
  const b = new AgenticStoreBackend(makeMemStore())
  await b.set('/multi.txt', 'line one\nline two\nline three')
  const r = await b.scan('line two')
  assert.equal(r[0].line, 2)
})

test('scan() returns empty array when no match', async () => {
  const b = new AgenticStoreBackend(makeMemStore())
  await b.set('/file.txt', 'nothing here')
  assert.deepEqual(await b.scan('zzznomatch'), [])
})
