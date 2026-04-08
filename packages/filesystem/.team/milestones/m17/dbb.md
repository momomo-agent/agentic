# m17 Done-By-Definition (DBB)

## DBB-001: Cross-backend consistency test suite exists
- Contract tests exist in `test/cross-backend.test.js` (extending the existing cross-backend test file)
- The suite runs identical assertions against: `MemoryStorage`, `AgenticStoreBackend`, `NodeFsBackend` (plus `LocalStorageBackend` and `SQLiteBackend` with mocks)
- Each backend is instantiated in a parameterized loop
- All backends pass the same test matrix

## DBB-002: Contract tests cover all StorageBackend methods
- `get()` returns `null` for missing paths, content string for existing paths
- `set()` creates files, overwrites existing content
- `delete()` removes files, no-op on missing paths (no throw)
- `list()` returns all paths with `/` prefix; `list(prefix)` filters correctly
- `scan()` returns `{ path, line, content }` array matching pattern
- `scanStream()` yields same results as `scan()` via async iteration
- `batchGet()` returns `Record<string, string | null>` matching individual `get()` calls
- `batchSet()` creates/updates all entries, visible via subsequent `get()`
- `stat()` returns `{ size, mtime, isDirectory }` or `null` for missing paths

## DBB-003: OPFSBackend empty-path validation
- `OPFSBackend.get('')` throws `IOError` with message containing "empty"
- `OPFSBackend.set('', 'x')` throws `IOError`
- `OPFSBackend.delete('')` throws `IOError`
- `OPFSBackend.stat('')` throws `IOError`
- Behavior matches `AgenticStoreBackend` and `NodeFsBackend` validation

## DBB-004: OPFSBackend.delete() graceful on missing path
- `OPFSBackend.delete('/nonexistent')` resolves without throwing
- No `IOError`, no `DOMException` propagated
- Matches `NodeFsBackend.delete()` behavior (swallows ENOENT) and `AgenticStoreBackend.delete()` behavior (Map.delete is no-op)

## DBB-005: SQLiteBackend in createBackend() auto-selection
- `createBackend()` in Node.js tries `SQLiteBackend` if a `better-sqlite3` or compatible adapter can be dynamically imported
- Falls back to `MemoryStorage` if SQLite import fails
- Does NOT break existing `NodeFsBackend` priority (Node.js still selects NodeFs first)
- `createBackend({ sqliteDb })` or similar option allows explicit SQLite selection
