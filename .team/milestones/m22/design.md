# Milestone m22 — Technical Design

## Overview
Close PRD and architecture gaps targeting backend consistency and OPFS hardening. Five tasks covering cross-backend tests, empty-path validation, error normalization, stat() directory detection, and delete() error handling.

## Task Dependency Order
All 5 tasks are independent — no task blocks another. They can be developed in parallel.

## Architecture Context

### Current Backend Error Behavior
| Backend | get(missing) | delete(missing) | stat(missing) | stat(dir) |
|---------|-------------|-----------------|---------------|-----------|
| NodeFsBackend | null (ENOENT → null) | no-op (ENOENT caught) | NotFoundError | isDirectory: true |
| AgenticStoreBackend | null | no-op | NotFoundError | N/A (flat store) |
| MemoryStorage | null | no-op | NotFoundError | N/A (flat store) |
| LocalStorageBackend | null | no-op | NotFoundError | N/A (flat store) |
| SQLiteBackend | null | no-op (SQL DELETE) | NotFoundError | N/A (flat store) |
| OPFSBackend | null (NotFoundError caught) | no-op (caught) | NotFoundError | **Always false** ← bug |

### Error Classes (src/errors.ts)
```ts
class NotFoundError extends Error { name = 'NotFoundError' }
class PermissionDeniedError extends Error { name = 'PermissionDeniedError' }
class IOError extends Error { name = 'IOError' }
```

## Task Summaries

### Task 1: Cross-Backend Consistency Test Suite
**File**: `test/cross-backend-consistency.test.js`
- Creates a test harness that instantiates all 6 backends (including OPFS mock)
- Runs identical operations per backend in a loop
- Asserts: get/set/delete/list/scan/batchGet/batchSet behavior
- Asserts: error types, path format, stat fields

### Task 2: OPFSBackend Empty-Path Validation
**File**: `src/backends/opfs.ts`
- `validatePath()` already exists and is called in get/set/delete/stat
- Add validation to `list(prefix)` when prefix is empty string
- Add validation to `scan(pattern)` / `scanStream(pattern)` when pattern is empty string
- Ensure consistent error message: "Path cannot be empty" or "Pattern cannot be empty"

### Task 3: Error Handling Normalization
**Files**: `src/backends/opfs.ts`, `src/backends/agentic-store.ts`
- Audit all catch blocks for silent swallowing
- Ensure `walkDir` in OPFS logs errors with context (already does `console.error`)
- Ensure `scanStream` skip catches are logged (currently silent in OPFS and NodeFs)
- Verify no empty `catch {}` blocks remain

### Task 4: OPFSBackend stat() Directory Detection
**File**: `src/backends/opfs.ts`, method `stat()`
- Current code at lines 184-188 already handles `TypeMismatchError` to detect directories
- Verify this works correctly in OPFS environment
- If `getFileHandle()` throws `TypeMismatchError`, call `getDirHandle()` to confirm directory
- Return `{ isDirectory: true, size: 0, mtime: 0 }` for confirmed directories
- Test with mock that simulates `TypeMismatchError` DOMException

### Task 5: OPFSBackend delete() Error Handling
**File**: `src/backends/opfs.ts`, method `delete()`
- Current code at lines 83-86 catches `NotFoundError` DOMException and returns
- Verify: parent directory traversal also catches NotFoundError properly
- Add test: `assert.doesNotReject(() => opfs.delete('/nonexistent'))`
- Add test: parent directory missing during delete also doesn't throw

## Key Files
- `src/backends/opfs.ts` — OPFSBackend (tasks 2, 3, 4, 5)
- `src/backends/agentic-store.ts` — AgenticStoreBackend (task 3)
- `src/backends/node-fs.ts` — NodeFsBackend (reference)
- `src/backends/memory.ts` — MemoryStorage (reference)
- `src/backends/sqlite.ts` — SQLiteBackend (reference)
- `src/backends/local-storage.ts` — LocalStorageBackend (reference)
- `src/errors.ts` — NotFoundError, PermissionDeniedError, IOError
- `src/types.ts` — StorageBackend interface
- `test/cross-backend.test.js` — existing cross-backend tests (reference pattern)
