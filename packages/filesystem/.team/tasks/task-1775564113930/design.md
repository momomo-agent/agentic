# Design: Fix NodeFsBackend Race Condition Test

## Problem
`test/concurrent.test.ts` line 201–220: `write-delete-write race condition` fires three ops concurrently. For NodeFsBackend, OS scheduling means the final state can be `null`, `'v1'`, or `'v2'`. The assertion only allows `null` or `'v2'`, causing intermittent failures.

## Fix

**File:** `test/concurrent.test.ts` (lines 213–217)

```ts
// Before:
const content = await backend.get('/test.txt')
if (content !== null) {
  assert.strictEqual(content, 'v2')
}

// After:
const content = await backend.get('/test.txt')
assert.ok(content === null || content === 'v1' || content === 'v2',
  `unexpected content: ${content}`)
```

## Verification
```bash
for i in 1 2 3 4 5; do npm test -- test/concurrent.test.ts; done
```
All 5 runs must pass with 0 failures.
