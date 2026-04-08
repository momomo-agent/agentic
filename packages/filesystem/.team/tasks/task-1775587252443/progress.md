# Create README with usage examples and per-backend configuration docs

## Progress

### Changes Made

1. **Added `createBackend()` auto-selection section** (after Quick Start):
   - Code example showing `await createBackend()`
   - Comment showing environment detection logic
   - Options for `rootDir` and `sqliteDb` overrides

2. **Added Per-Backend Configuration table** (in Backends section):
   - Table with Constructor and Options columns for all 6 backends
   - Added notes about OPFS HTTPS requirement and SQLite better-sqlite3 dependency

3. **Updated Custom Backend example** (in Custom Storage Backend section):
   - Added `scanStream()` — streaming async iterable
   - Added `batchGet()` — multi-path read
   - Added `batchSet()` — multi-path write
   - Added `stat()` — file metadata with permissions
   - Fixed `stat` return type to include `permissions` field matching actual interface

### Verification
- All code examples are syntactically correct TypeScript
- Matches actual `StorageBackend` interface in `src/types.ts`
- `createBackend()` example matches actual export in `src/index.ts`
- No existing content was removed or broken
