# m19 Done-By-Definition (DBB)

## DBB-001: Permissions field on stat() result
- `StorageBackend.stat()` return type in `src/types.ts` includes `permissions?: { read: boolean; write: boolean }` field
- `AgenticStoreBackend.stat()` returns `permissions: { read: true, write: true }` for existing files
- `NodeFsBackend.stat()` returns `permissions` reflecting actual filesystem mode (via `fs.stat` `mode` bits)
- `OPFSBackend.stat()` returns `permissions: { read: true, write: true }` (OPFS always read-write)
- `MemoryStorage.stat()` returns `permissions: { read: true, write: true }` (new method added)
- `SQLiteBackend.stat()` returns `permissions: { read: true, write: true }`
- `LocalStorageBackend.stat()` returns `permissions: { read: true, write: true }` (new method added)
- `stat()` returning `null` for missing paths is unchanged
- Cross-backend tests include `permissions` field assertion in stat() tests

## DBB-002: AgenticStoreBackend scan() streaming verification
- `AgenticStoreBackend.scanStream()` already iterates per-key without loading all content simultaneously
- Verify current implementation is acceptable (per-key get + line split is the standard pattern)
- `scan()` still delegates to `scanStream()` (unchanged)
- Cross-backend test confirms `scanStream` results match `scan()` results

## DBB-003: Cross-backend test coverage completeness
- `test/cross-backend.test.js` covers all 5 Node.js-testable backends: `NodeFsBackend`, `AgenticStoreBackend`, `MemoryStorage`, `LocalStorageBackend`, `SQLiteBackend`
- All StorageBackend methods tested per backend: `get`, `set`, `delete`, `list`, `scan`, `batchGet`, `batchSet`, `stat`
- `stat()` test includes `permissions` field assertion (after DBB-001)
- `MemoryStorage` and `LocalStorageBackend` have `stat()` coverage (after DBB-001 adds the method)
- Test matrix documented: each method x each backend has at least one passing test
- OPFSBackend excluded from Node.js suite (browser-only, documented)

## DBB-004: Standardized error handling across backends
- All backends throw `IOError` for I/O failures on `get()`, `set()`, `delete()`, `list()`, `stat()`, `batchGet()`, `batchSet()`
- All backends return `null` (not throw) for missing files on `get()` and `stat()` — this is by design
- All backends silently succeed (no throw) on `delete()` for missing paths
- All backends validate empty path with `IOError('Path cannot be empty')`
- `AgenticStoreBackend.stat()` does not silently swallow errors (currently catches all and returns null — should propagate IOError for non-not-found errors)
- `SQLiteBackend.stat()` same treatment — propagate IOError for unexpected failures
- Cross-backend tests verify: `stat('')` throws IOError, `get('')` throws IOError
