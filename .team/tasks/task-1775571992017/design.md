# Design: Concurrent write tests (10+ files) and race condition coverage

## File to Modify
- `test/concurrent.test.ts`

## Current State
- Already has 20-file concurrent write test (passes)
- Has same-file concurrent write test with 10 writes

## Gap
- Same-file test only asserts no error + valid format, but doesn't assert 10 concurrent writes specifically
- Need explicit test label making the 10-write count clear

## Changes
Add to each backend's describe block:

```ts
test('10 concurrent writes to same file, no corruption', async () => {
  const { backend, cleanup } = await create()
  try {
    await Promise.all(
      Array.from({ length: 10 }, (_, i) => backend.set('/race.txt', `v${i}`))
    )
    const content = await backend.get('/race.txt')
    assert.match(content!, /^v\d+$/)
  } finally {
    await cleanup()
  }
})
```

## Note
The existing `concurrent writes to different files succeed` test already uses 20 files — DBB-002 is already satisfied. The new test explicitly names the 10-concurrent-same-file scenario for DBB-003 clarity.

## Test Cases to Verify
1. 20 concurrent writes to different files → all content correct
2. 10 concurrent writes to same file → no error, final value matches one write
3. Concurrent read-while-write → reads return valid value (existing)
4. Concurrent deletes → file deleted, no error (existing)
