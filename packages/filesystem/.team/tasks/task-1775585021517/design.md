# Task Design: OPFSBackend Empty-Path Validation

**Task ID:** task-1775585021517
**Priority:** P0
**Milestone:** m17

## Files to Modify
- `src/backends/opfs.ts` — add `validatePath()` to `stat()` (get/set/delete already have it)

## Current State

`OPFSBackend` has a `validatePath(path)` method (line 10-12) that throws `IOError('Path cannot be empty')` on empty string.

**Already validated:** `get()` (line 40), `set()` (line 51), `delete()` (line 61) — all call `this.validatePath(path)`.

**Missing:** `stat()` (line 134) does NOT call `this.validatePath(path)`.

## Change Required

In `src/backends/opfs.ts`, `stat()` method (line 134):

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null> {
  this.validatePath(path)   // ← ADD THIS LINE
  try {
    const fh = await this.getFileHandle(path)
    // ... rest unchanged
```

## Function Signature
No signature change. `stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null>`

## Error Handling
- `stat('')` → throws `IOError('Path cannot be empty')`
- All other behavior unchanged

## Test Case

Add to existing test file or create `test/backends/opfs-validation.test.ts`:

```ts
it('stat() rejects empty path', async () => {
  const backend = new OPFSBackend()
  await assert.rejects(
    () => backend.stat(''),
    (e: any) => e.name === 'IOError' && /empty/i.test(e.message)
  )
})
```

Note: OPFS tests require browser environment. Verify `validatePath` call is present in code; full integration test via Playwright if browser test harness available. The cross-backend consistency test (task-1775585021267) will also cover this for non-OPFS backends.

## Dependencies
- None
