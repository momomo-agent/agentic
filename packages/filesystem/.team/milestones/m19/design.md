# m19 Technical Design — PRD Gap Closure: Streaming, Error Consistency & stat() Parity

## Overview

Four tasks targeting PRD gaps in stat() metadata, scan() efficiency, test coverage completeness, and error handling consistency.

## 1. Permissions Field on stat() (task-1775586676543)

**Problem:** PRD §2 requires `stat()` to return `{ size, mtime, isDirectory, permissions }`. The `permissions` field is missing from the `StorageBackend` interface and all backend implementations.

**Approach:**
- Add `permissions?: { read: boolean; write: boolean }` to the `stat()` return type in `src/types.ts`
- Reuse the existing `Permission` type from `types.ts` (already `{ read: boolean; write: boolean }`)
- Per-backend implementation:
  - **NodeFsBackend**: Compute from filesystem `mode` bits — check owner read (`0o400`) and write (`0o200`) from `fs.stat` result
  - **OPFSBackend**: Always `{ read: true, write: true }` (OPFS is always read-write in current origin)
  - **AgenticStoreBackend**: Always `{ read: true, write: true }` (in-memory store has no restrictions)
  - **MemoryStorage**: Add `stat()` method — return `{ size: content.length, mtime: 0, isDirectory: false, permissions: { read: true, write: true } }`
  - **SQLiteBackend**: Add `permissions: { read: true, write: true }` to existing `stat()` return
  - **LocalStorageBackend**: Add `stat()` method — return `{ size: content.length, mtime: 0, isDirectory: false, permissions: { read: true, write: true } }`

**Files:** `src/types.ts`, all 6 backend files

## 2. AgenticStoreBackend scan() Streaming (task-1775586676705)

**Problem:** PRD §1 flags scan() memory efficiency. Current `scanStream()` iterates per-key, loads one value at a time, and yields matches line by line — this is already streaming per-key.

**Approach:**
- Current implementation is already reasonable per-key streaming
- The underlying `AgenticStore` interface has no cursor/pagination API, so full value load per key is unavoidable
- Verify via test that scanStream works correctly (existing tests already cover this)
- No source code changes needed — verification-only task

**Files:** Test file only

## 3. Cross-Backend Test Coverage (task-1775586679805)

**Problem:** PRD §4 requires all backends pass the same test suite. Need to audit and fill gaps.

**Current coverage:**
- `test/cross-backend.test.js`: get/set/delete/list/scan/batchGet/batchSet/stat for 5 backends
- `test/cross-backend-extra.test.js`: scanStream consistency, edge cases
- Gap: `MemoryStorage` and `LocalStorageBackend` lack `stat()` method (will be added by task 1)
- Gap: `permissions` field not asserted in stat tests

**Approach:**
- After task 1 adds `stat()` to MemoryStorage and LocalStorageBackend, both backends auto-inherit existing `stat()` tests in the for-loop
- Add `permissions` assertion to existing stat tests: `assert.ok(s.permissions && typeof s.permissions.read === 'boolean')`
- Add `stat('')` empty-path validation test
- Audit method coverage matrix and document gaps if any

**Files:** `test/cross-backend.test.js`, `test/cross-backend-extra.test.js`

## 4. Standardized Error Handling (task-1775586684332)

**Problem:** PRD §3 requires consistent typed error throws. Some backends silently swallow all errors in `stat()`.

**Current issues:**
- `AgenticStoreBackend.stat()`: `catch { return null }` swallows IOError
- `SQLiteBackend.stat()`: `catch { return null }` swallows IOError
- `NodeFsBackend.stat()`: `catch { return null }` swallows IOError
- Contrast: `OPFSBackend.get()` correctly distinguishes NotFoundError from IOError

**Approach:**
- `AgenticStoreBackend.stat()`: Change catch to distinguish store errors (throw IOError) from not-found (return null). Currently `value == null` returns null correctly; wrap the catch to throw IOError for unexpected failures.
- `SQLiteBackend.stat()`: Same — if `this.db.prepare().get()` throws, wrap in IOError. Undefined row = not found = null.
- `NodeFsBackend.stat()`: Already uses `stat()` from fs/promises. Catch all and return null is acceptable since Node `stat` throws for not-found and permission errors alike.
- Add `NotFoundError` to backend imports where useful.
- DO NOT change API contract: `get()` and `stat()` return null for missing files, `delete()` is no-op for missing files.
- Add error propagation tests.

**Files:** `src/backends/agentic-store.ts`, `src/backends/sqlite.ts`, `test/cross-backend.test.js`
