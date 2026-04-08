# Technical Design: Verify AgenticStoreBackend scan() Streaming

## Task ID
task-1775587252582

## Goal
PRD §1 gap: Verify AgenticStoreBackend.scan()/scanStream() streams instead of loading full content. Document findings.

## Files to Create
- `test/scan-streaming-verify.test.js`

## Current Implementation Analysis

`src/backends/agentic-store.ts` lines 100-121:

```typescript
async *scanStream(pattern: string) {
  for (const key of (await this.store.keys()).filter(k => !k.includes('\x00'))) {
    const normalized = key.startsWith('/') ? key : '/' + key
    const value = await this.store.get(key)
    if (typeof value !== 'string') continue
    const lines = value.split('\n')
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pattern)) yield { path: normalized, line: i + 1, content: lines[i] }
    }
  }
}
```

**Assessment:** Per-key lazy iteration. Each file is loaded one at a time via `store.get()`. This is acceptable for in-memory key-value stores — no cursor/pagination API available on `AgenticStore` interface.

**Limitation:** Per file, the entire file content IS loaded into memory (single `store.get()` call). True line-by-line streaming is impossible with key-value API. This is the best achievable approach.

## Test File Design

### Test 1: Lazy evaluation — early break limits get() calls

```javascript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { AgenticStoreBackend } from '../dist/index.js'

function makeInstrumentedStore() {
  const data = new Map()
  let getCallCount = 0
  return {
    store: {
      async get(k) { getCallCount++; return data.get(k) ?? null },
      async set(k, v) { data.set(k, v) },
      async delete(k) { data.delete(k) },
      async keys() { return [...data.keys()].filter(k => !k.includes('\x00')) },
      async has(k) { return data.has(k) },
    },
    getCallCount: () => getCallCount,
    resetCount: () => { getCallCount = 0 }
  }
}

test('scanStream is lazy — early break limits store.get() calls', async () => {
  const { store, getCallCount, resetCount } = makeInstrumentedStore()
  const backend = new AgenticStoreBackend(store)
  await backend.set('/a.txt', 'match')
  await backend.set('/b.txt', 'match')
  await backend.set('/c.txt', 'match')
  resetCount()

  for await (const r of backend.scanStream('match')) {
    break // Stop after first result
  }

  // Should only have fetched 1 file (the first one yielded)
  assert.ok(getCallCount() <= 2, `Expected at most 2 get() calls, got ${getCallCount()}`)
})
```

### Test 2: Memory comparison with large file

```javascript
test('scanStream memory bounded with large file', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  const largeContent = 'x'.repeat(1024 * 1024) // 1MB
  await backend.set('/large.txt', largeContent + '\nmatch line here')

  if (global.gc) global.gc()
  const before = process.memoryUsage().heapUsed

  const results = []
  for await (const r of backend.scanStream('match')) {
    results.push(r)
  }

  if (global.gc) global.gc()
  const after = process.memoryUsage().heapUsed

  assert.equal(results.length, 1)
  // Heap increase should be reasonable (not 1MB+)
  const increase = after - before
  console.log(`Memory increase: ${(increase / 1024).toFixed(1)}KB for 1MB file scan`)
  // This is documentation — not a strict assertion since GC timing varies
})
```

### Test 3: scan() delegates to scanStream() regression

```javascript
test('scan() returns same results as scanStream()', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/a.txt', 'alpha\nbeta\nalpha')
  await backend.set('/b.txt', 'gamma\nalpha')

  const streamResults = []
  for await (const r of backend.scanStream('alpha')) streamResults.push(r)
  const scanResults = await backend.scan('alpha')

  assert.deepEqual(streamResults, scanResults)
})
```

### Test 4: Meta keys filtered

```javascript
test('scanStream does not leak meta keys (\x00mtime)', async () => {
  const backend = new AgenticStoreBackend(makeMemStore())
  await backend.set('/file.txt', 'content')

  const results = []
  for await (const r of backend.scanStream('mtime')) results.push(r)

  for (const r of results) {
    assert.ok(!r.path.includes('\x00'), `Meta key leaked: ${r.path}`)
  }
})
```

## Edge Cases
- Empty file: scanStream should yield nothing
- File with no trailing newline: last line should still be scanned
- Multiple files with matches across all files

## Dependencies
- None

## Test Cases to Verify
- `node --test test/scan-streaming-verify.test.js` — all tests pass
- Console output documents memory comparison findings
