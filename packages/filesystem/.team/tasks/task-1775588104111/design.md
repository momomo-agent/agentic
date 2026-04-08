# Task Design: Fix OPFSBackend consistency — stat() directory support, delete() error handling, empty-path validation

## Summary

Three OPFS-specific consistency gaps identified by architecture audit. **All three features are already implemented** in `src/backends/opfs.ts`. This task's scope is **verification + filling test coverage gaps**.

## Current Implementation Status

### 1. stat() directory support — IMPLEMENTED (`src/backends/opfs.ts:177-192`)

When `getFileHandle()` throws `DOMException('TypeMismatchError')` (path is a directory), `stat()` catches it, calls `getDirHandle(path)` to verify the directory exists, and returns `{ size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } }`. If `getDirHandle` also fails, returns `null`.

### 2. delete() error handling — IMPLEMENTED (`src/backends/opfs.ts:74-87`)

Catches `DOMException('NotFoundError')` and silently returns (no-op). Other errors wrapped in `IOError`. Matches NodeFsBackend and AgenticStoreBackend behavior.

### 3. Empty-path validation — IMPLEMENTED (`src/backends/opfs.ts:10-12`)

`validatePath(path)` throws `IOError('Path cannot be empty')` when `path === ''`. Called in `get()`, `set()`, `delete()`, `stat()`, `batchGet()`, `batchSet()` (via individual methods).

## Existing Test Coverage

| Test File | Coverage | Runs in Node? |
|-----------|----------|---------------|
| `test/opfs-stat-isdirectory.test.js` | stat() file/dir/missing via mock logic | Yes (mock-based) |
| `test/opfs-m15.test.js` | delete() no-op, empty-path for get/set/delete | Skips (browser-only) |
| `test/opfs-walkdir-error.test.js` | walkDir error resilience | Yes (mock-based) |

## What the Developer Must Do

### Step 1: Verify implementations match contract
Read `src/backends/opfs.ts` and confirm all three behaviors are correct. No source changes expected.

### Step 2: Add missing test cases to `test/opfs-m15.test.js`

The existing file covers delete() and empty-path for get/set/delete. **Missing tests:**

```js
// stat("") throws IOError
it('stat("") throws IOError', async () => {
  await assert.rejects(() => backend.stat(''), /Path cannot be empty/)
})

// stat on missing path returns null
it('stat on missing path returns null', async () => {
  const result = await backend.stat('/nonexistent-opfs-stat-verify.txt')
  assert.strictEqual(result, null)
})

// stat on directory returns isDirectory: true
it('stat on directory returns isDirectory: true', async () => {
  await backend.set('/stat-dir-test/file.txt', 'hello')
  const result = await backend.stat('/stat-dir-test')
  assert.ok(result !== null)
  assert.equal(result.isDirectory, true)
  assert.equal(result.size, 0)
})
```

### Step 3: Cross-check mock test vs real implementation

Compare `test/opfs-stat-isdirectory.test.js` mock logic (function `makeOPFSStatLogic`, lines 7-47) against the real `src/backends/opfs.ts:177-192`. The mock should accurately reflect:
- `getFileHandle` throwing `DOMException('TypeMismatchError')` for directory paths
- `getDirHandle` throwing `DOMException('NotFoundError')` for missing directories
- The catch chain: TypeMismatchError → getDirHandle → isDirectory:true, or null

If the mock diverges, update it.

## Files

| File | Action |
|------|--------|
| `src/backends/opfs.ts` | Read-only — verify correctness, do NOT modify |
| `test/opfs-m15.test.js` | Add stat() empty-path + stat null + stat directory tests |
| `test/opfs-stat-isdirectory.test.js` | Verify mock matches real implementation |

## Edge Cases to Consider

- Nested directory: `stat('/dir/subdir')` where both exist as directories
- `delete('/dir')` on non-empty directory: OPFS `removeEntry()` throws `InvalidModificationError` without `{ recursive: true }` — current code does NOT pass `recursive: true`. This is acceptable (matches Unix `rmdir` semantics). Document if the task description expects different behavior.
- `stat()` after set+delete: should return null

## Verification

```bash
npx tsx --test test/opfs-stat-isdirectory.test.js  # mock tests, should pass in Node.js
npx tsx --test test/opfs-m15.test.js               # skips in Node.js (browser-only)
```

All real OPFS tests skip in Node.js — this is expected and correct. OPFS is a browser-only API.
