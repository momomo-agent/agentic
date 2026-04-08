# Task Design: OPFSBackend delete() Graceful Error Handling

**Task ID:** task-1775585021564
**Priority:** P1
**Milestone:** m17

## Files to Verify/Modify
- `src/backends/opfs.ts` — `delete()` method (lines 60-73)
- `test/cross-backend-consistency.test.ts` — add OPFS-specific delete test

## Current State

`OPFSBackend.delete()` (lines 60-73) already handles missing paths gracefully:

```ts
async delete(path: string): Promise<void> {
  this.validatePath(path)
  const parts = path.replace(/^\//, '').split('/')
  let dir = await this.getRoot()
  try {
    for (const part of parts.slice(0, -1)) {
      dir = await dir.getDirectoryHandle(part)
    }
    await dir.removeEntry(parts[parts.length - 1])
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return  // ← ALREADY GRACEFUL
    throw new IOError(String(e))
  }
}
```

**However**, there is a subtle edge case: if a *parent directory* doesn't exist, `getDirectoryHandle()` throws `NotFoundError` during the path traversal loop (line 65), which is caught and handled. But if the *file itself* doesn't exist, `removeEntry()` throws `NotFoundError`, also caught. Both cases are handled.

## Required Work

This is primarily a **test-only** task. No code changes expected.

### Verification Steps
1. Confirm `delete('/nonexistent')` resolves without error
2. Confirm `delete('/nonexistent/nested')` resolves without error (missing parent directory)
3. Add explicit tests in the cross-backend consistency suite (task-1775585021267)

### Test Case

In `test/cross-backend-consistency.test.ts` (from task-1775585021267), the contract test for "delete missing — no throw" covers this:

```ts
it('delete missing path — no throw', async () => {
  await assert.doesNotReject(() => backend.delete('/does-not-exist.txt'))
})
```

If OPFS-specific test needed (outside the shared suite):

```ts
it('delete() on nonexistent path silently succeeds', async () => {
  const backend = new OPFSBackend()
  await assert.doesNotReject(() => backend.delete('/nonexistent'))
})
```

## Edge Cases
- Delete path where parent directory also doesn't exist → caught by `getDirectoryHandle` NotFoundError
- Delete path with deep nesting, all missing → caught during traversal
- Delete after previous delete (double delete) → second call is no-op

## Dependencies
- Depends on task-1775585021267 (cross-backend test suite) for full integration test
