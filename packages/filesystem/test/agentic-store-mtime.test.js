// Tests for DBB-003: AgenticStoreBackend.stat() real mtime
// Verifies mtime is stored at write time, not generated at stat() time
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
    _data: data,
  }
}

// DBB-003: Two successive stat() calls on an unchanged file return the same mtime
test('DBB-003: two stat() calls return same mtime for unchanged file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/file.txt', 'hello')
  const stat1 = await backend.stat('/file.txt')
  // small delay to ensure Date.now() would differ if called at stat time
  await new Promise(r => setTimeout(r, 10))
  const stat2 = await backend.stat('/file.txt')
  assert.ok(stat1 !== null)
  assert.ok(stat2 !== null)
  assert.equal(stat1.mtime, stat2.mtime, 'mtime should be identical on successive stat() calls')
})

// DBB-003: mtime is the timestamp from write time, not Date.now() at stat() time
test('DBB-003: mtime is from write time, not stat() call time', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  const before = Date.now()
  await backend.set('/timing.txt', 'data')
  const afterSet = Date.now()

  // delay significantly so stat() Date.now() would be clearly different
  await new Promise(r => setTimeout(r, 50))

  const meta = await backend.stat('/timing.txt')
  assert.ok(meta !== null)
  assert.ok(meta.mtime >= before, `mtime ${meta.mtime} should be >= before ${before}`)
  assert.ok(meta.mtime <= afterSet, `mtime ${meta.mtime} should be <= afterSet ${afterSet}`)
})

// Design: set('/f', 'y') updates mtime
test('overwrite via set() updates mtime to newer value', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/overwrite.txt', 'original')
  const stat1 = await backend.stat('/overwrite.txt')

  await new Promise(r => setTimeout(r, 50))

  await backend.set('/overwrite.txt', 'updated')
  const stat2 = await backend.stat('/overwrite.txt')

  assert.ok(stat1 !== null)
  assert.ok(stat2 !== null)
  assert.ok(stat2.mtime > stat1.mtime, 'mtime after overwrite should be greater than original mtime')
})

// Design: delete('/f') removes mtime key (no orphan keys)
test('delete() removes mtime meta key — no orphan keys', async () => {
  const store = makeMemStore()
  const backend = new AgenticStoreBackend(store)
  await backend.set('/cleanup.txt', 'content')

  // verify mtime key exists
  const keysBefore = await store.keys()
  assert.ok(keysBefore.some(k => k.includes('\x00mtime')), 'mtime meta key should exist after set()')

  await backend.delete('/cleanup.txt')

  // verify no mtime key remains
  const keysAfter = await store.keys()
  assert.ok(!keysAfter.some(k => k.includes('\x00mtime')), 'mtime meta key should be removed after delete()')
  assert.equal(keysAfter.length, 0, 'no keys should remain after delete()')
})

// Graceful fallback: file without mtime key returns mtime: 0
test('stat() returns mtime: 0 for file written before mtime tracking', async () => {
  const store = makeMemStore()
  const backend = new AgenticStoreBackend(store)
  // Simulate legacy file: content exists but no mtime meta key
  await store.set('/legacy.txt', 'old content')
  const meta = await backend.stat('/legacy.txt')
  assert.ok(meta !== null)
  assert.equal(meta.mtime, 0, 'missing mtime key should gracefully return 0')
})

// list() should not expose mtime meta keys
test('list() does not return mtime meta keys', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/a.txt', 'a')
  await backend.set('/b.txt', 'b')
  const files = await backend.list()
  assert.deepEqual(files.sort(), ['/a.txt', '/b.txt'])
  assert.ok(!files.some(f => f.includes('\x00')), 'no meta keys should appear in list()')
})

// scanStream() should not include mtime meta keys
test('scanStream() does not scan mtime meta keys', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/scanme.txt', 'hello world')
  const results = []
  for await (const r of backend.scanStream('hello')) results.push(r)
  assert.equal(results.length, 1)
  assert.equal(results[0].path, '/scanme.txt')
})
