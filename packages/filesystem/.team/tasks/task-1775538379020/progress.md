# Add SQLite backend adapter

## Progress

## Completed
- Created `src/backends/sqlite.ts` with SQLiteBackend class
- Implemented all StorageBackend interface methods:
  - `get()` - SELECT content by path, returns null if not found
  - `set()` - INSERT OR REPLACE with size and mtime tracking
  - `delete()` - DELETE by path
  - `list()` - SELECT all paths or filter by prefix with LIKE
  - `scan()` - Collects all results from scanStream
  - `scanStream()` - Iterates rows, splits content by lines, yields matches
  - `batchGet()` - Single SELECT with IN clause, maps results
  - `batchSet()` - Wrapped in transaction (BEGIN/COMMIT/ROLLBACK)
  - `stat()` - Returns size and mtime metadata
- Added path normalization (ensures `/` prefix)
- Implemented proper error handling with IOError wrapping
- Duck-typed interfaces for both better-sqlite3 and sql.js compatibility
- Schema initialization in constructor with CREATE TABLE IF NOT EXISTS
- Exported SQLiteBackend from `src/index.ts`

## Implementation Notes
- Used duck-typing to support both better-sqlite3 (Node) and sql.js (browser)
- All database operations wrapped in try/catch with IOError
- batchSet uses transaction for atomicity (rolls back on error)
- Path normalization applied in get/set/delete/stat/batchGet/batchSet
- list() ensures all returned paths start with `/`
- scanStream yields results one at a time without loading full files

## Ready for Review
Implementation follows the design spec exactly. All methods implemented according to StorageBackend interface.
