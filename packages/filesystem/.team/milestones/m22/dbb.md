# Milestone m22 — DBB (Definition of Backend Behavior)

## Verification Criteria

### 1. Cross-Backend Consistency (PRD §4)
- [ ] A single test file runs identical operations against all 6 backends (AgenticStore, OPFS, NodeFs, Memory, SQLite, LocalStorage)
- [ ] All backends return identical results for: get, set, delete, list, scan, batchGet, batchSet
- [ ] Path format: all backends return paths with `/` prefix
- [ ] Error types: all backends throw `NotFoundError` on missing `get()` returning `null` (not thrown) but `stat()` throws `NotFoundError` for missing files
- [ ] Empty path: all backends throw `IOError` with "Path cannot be empty" on empty path for get/set/delete/stat
- [ ] `list()` result format: all backends return `string[]` with `/`-prefixed paths
- [ ] `stat()` field completeness: `{ size: number, mtime: number, isDirectory: boolean, permissions: { read: boolean, write: boolean } }`

### 2. OPFSBackend Empty-Path Validation (ARCH gap)
- [ ] `OPFSBackend.get('')` throws `IOError('Path cannot be empty')`
- [ ] `OPFSBackend.set('', content)` throws `IOError('Path cannot be empty')`
- [ ] `OPFSBackend.delete('')` throws `IOError('Path cannot be empty')`
- [ ] `OPFSBackend.stat('')` throws `IOError('Path cannot be empty')`
- [ ] Validation pattern matches `AgenticStoreBackend.validatePath()` and `NodeFsBackend.validatePath()`
- [ ] `list(prefix)` and `scan(pattern)` also reject empty string arguments consistently

### 3. Error Handling Normalization (PRD §3)
- [ ] No empty `catch {}` blocks in any backend — every caught error is either re-thrown as typed error or explicitly logged
- [ ] `OPFSBackend` catch blocks wrap non-DOMException errors in `IOError`
- [ ] `AgenticStoreBackend` catch blocks wrap store errors in `IOError`
- [ ] All backends consistently throw: `NotFoundError` (missing files), `PermissionDeniedError` (access denied), `IOError` (everything else)
- [ ] `scanStream()` skip-unreadable-files catches are logged with `console.error` (not silent)

### 4. OPFSBackend stat() Directory Detection (ARCH gap)
- [ ] `OPFSBackend.stat('/existing-dir')` returns `{ isDirectory: true, size: 0, ... }` when path is a directory
- [ ] `OPFSBackend.stat('/existing-file.txt')` returns `{ isDirectory: false, size: N, ... }` when path is a file
- [ ] `OPFSBackend.stat('/nonexistent')` throws `NotFoundError`
- [ ] Directory detection uses OPFS `getDirectoryHandle()` to distinguish dirs from files
- [ ] Behavior matches `NodeFsBackend.stat()` for directories

### 5. OPFSBackend delete() Error Handling (ARCH gap)
- [ ] `OPFSBackend.delete('/nonexistent')` returns silently (no throw), matching `NodeFsBackend` and `AgenticStoreBackend`
- [ ] `OPFSBackend.delete('/existing')` removes the file and returns silently
- [ ] Only non-NotFoundError DOMExceptions are wrapped in `IOError` and re-thrown
- [ ] Test: `assert.doesNotReject(() => backend.delete('/nope'))` passes for OPFSBackend
