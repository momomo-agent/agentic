# Design: Expand concurrent write and race condition tests

## File to Modify
- `test/concurrent.test.ts` — expand existing concurrent tests

## What to Add

### 1. Expand "concurrent writes to different files" to 10+ files
The existing test already uses 20 files (`Array.from({ length: 20 }, ...)`). This DBB criterion is already met in the current file. Verify the test passes and no change needed.

### 2. Non-trivial race condition tests for same-file concurrent writes
Add to the existing `for` loop over `backends` (NodeFs and AgenticStore are the targets, but the loop covers all):

```ts
test('50 concurrent writes to same file, final value is valid', async () => {
  const { backend, cleanup } = await create()
  try {
    await Promise.all(
      Array.from({ length: 50 }, (_, i) => backend.set('/hotspot.txt', `w${i}`))
    )
    const content = await backend.get('/hotspot.txt')
    assert.match(content!, /^w\d+$/)
  } finally {
    await cleanup()
  }
})

test('interleaved set/get/delete on same file, no crash', async () => {
  const { backend, cleanup } = await create()
  try {
    const ops = Array.from({ length: 30 }, (_, i) => {
      if (i % 3 === 0) return backend.set('/shared.txt', `v${i}`)
      if (i % 3 === 1) return backend.get('/shared.txt')
      return backend.delete('/shared.txt')
    })
    await Promise.all(ops)
    // No assertion on final value — just must not throw
  } finally {
    await cleanup()
  }
})
```

## Edge Cases
- All backends in the loop must handle 50 concurrent writes without throwing
- Final value after concurrent writes must match the pattern (no corruption/empty string from race)

## Dependencies
- `StorageBackend.set/get/delete` — already exist on all backends
