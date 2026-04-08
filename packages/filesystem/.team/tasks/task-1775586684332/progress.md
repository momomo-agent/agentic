# Standardize error handling across backends — typed throws vs silent swallow

## Progress

### Source Changes

1. **`src/types.ts`**: Removed `| null` from `stat()` return type in `StorageBackend` interface
2. **`src/backends/agentic-store.ts`**: `stat()` now throws `NotFoundError` for missing files instead of returning `null`; imports `NotFoundError`
3. **`src/backends/opfs.ts`**: `stat()` now throws `NotFoundError` for missing files/dirs; imports `NotFoundError`
4. **`src/backends/node-fs.ts`**: `stat()` now throws `NotFoundError` for ENOENT, `IOError` for other errors; imports `NotFoundError`
5. **`src/backends/sqlite.ts`**: `stat()` now throws `NotFoundError` for missing rows; imports `NotFoundError`
6. **`src/backends/memory.ts`**: `stat()` now throws `NotFoundError` for undefined entries; imports `NotFoundError`
7. **`src/backends/local-storage.ts`**: `stat()` now throws `NotFoundError` for null items; imports `NotFoundError`
8. **`src/filesystem.ts`**: `ls()` and `tree()` now wrap `stat()` calls in try/catch to gracefully handle `NotFoundError` (race condition: file deleted between list and stat)

### Test Changes

Updated all tests that expected `stat()` to return `null` for missing files:
- `test/cross-backend.test.js`
- `test/stat-implementation.test.js`
- `test/stat-backends.test.js`
- `test/stat-isdirectory.test.js`
- `test/m6-stat-agent-tools.test.js`
- `test/sqlite-backend.test.js`
- `test/m19-stat-permissions.test.js` (6 individual tests + 1 cross-backend)
- `test/backends/agentic-store-stat.test.ts`
- `test/backends/opfs-stat.test.ts`
- `test/opfs-stat-isdirectory.test.js` (mock updated + 2 tests)

### Verification

- All 594 tests pass (0 failures, 3 skipped OPFS browser-only tests)
- Build succeeds
- `get()` contract unchanged (still returns `null` for missing files)
- `delete()` contract unchanged (still resolves without throw for missing files)
