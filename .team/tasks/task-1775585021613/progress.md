# Progress: SQLiteBackend in createBackend() Auto-Selection

## Changes Made

### src/index.ts
- Added `sqliteDb?: unknown` to `createBackend()` options type
- Added explicit SQLite selection branch at the top of the auto-selection chain:
  - If `options.sqliteDb` is provided, dynamically imports `SQLiteBackend` and returns a new instance
  - Takes precedence over all auto-detection (NodeFs, OPFS, IndexedDB, Memory)
- Existing auto-detection chain (Node.js → Browser) unchanged

### test/create-default-backend.test.ts
- Imported `SQLiteBackend` from index
- Added test: `createBackend({ sqliteDb }) returns SQLiteBackend` — uses mock db object
- Added test: `createBackend() without sqliteDb uses auto-selection (NodeFs)` — verifies Node.js default

## Test Results
- All 7 tests pass (5 existing + 2 new)
