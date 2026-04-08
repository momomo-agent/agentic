# Task Design: Cross-Backend Consistency Test Suite

**Task ID:** task-1775585021267
**Priority:** P0
**Milestone:** m17

## Files to Modify
- `test/cross-backend.test.js` — extend with `batchGet`, `batchSet`, and `stat` assertions

## Approach

The existing `test/cross-backend.test.js` already tests 5 backends (`NodeFsBackend`, `AgenticStoreBackend`, `MemoryStorage`, `LocalStorageBackend`, `SQLiteBackend`) via a `for` loop with mock stores. Current coverage: get/set, delete, list, scan, empty-path validation.

Add new test cases inside the existing `for` loop, before the final `cleanup()` call.

### New Tests to Add

**batchGet round-trip:**
```js
test(`${name}: batchGet`, async () => {
  await backend.set('/batch-a', '1')
  await backend.set('/batch-b', '2')
  const result = await backend.batchGet(['/batch-a', '/batch-b', '/batch-missing'])
  assert.equal(result['/batch-a'], '1')
  assert.equal(result['/batch-b'], '2')
  assert.equal(result['/batch-missing'], null)
})
```

**batchSet round-trip:**
```js
test(`${name}: batchSet`, async () => {
  await backend.batchSet({ '/batch-x': '10', '/batch-y': '20' })
  assert.equal(await backend.get('/batch-x'), '10')
  assert.equal(await backend.get('/batch-y'), '20')
})
```

**stat existing file:**
```js
test(`${name}: stat returns size for existing file`, async () => {
  await backend.set('/stat-file', 'hello')
  const s = await backend.stat?.('/stat-file')
  if (s !== undefined) {
    assert.equal(s.isDirectory, false)
    assert.ok(s.size >= 5)   // 'hello' = 5 bytes
    assert.ok(typeof s.mtime === 'number')
  }
})
```

**stat missing file:**
```js
test(`${name}: stat returns null for missing`, async () => {
  const s = await backend.stat?.('/stat-missing')
  if (s !== undefined) assert.equal(s, null)
})
```

## Dependencies
- None — all backends and mock stores already exist in the test file

## Edge Cases
- `batchGet` with all-missing keys returns all nulls
- `batchSet` with empty object is a no-op
- `stat` tests guarded with `?.()` since MemoryStorage lacks stat
- LocalStorageBackend uses UTF-16 internally — size assertion uses `>=` not `===`
