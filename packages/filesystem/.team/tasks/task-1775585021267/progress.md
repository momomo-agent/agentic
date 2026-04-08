# Cross-backend consistency test suite

## Progress

### Changes Made

**`test/cross-backend.test.js`** - Added 4 new test cases inside the existing `for` loop (runs across all 5 backends):

1. **batchGet round-trip** - Sets 2 files, batchGets 3 paths (2 existing + 1 missing), verifies correct values and null for missing
2. **batchSet round-trip** - batchSets 2 entries, verifies each with individual get()
3. **stat returns size for existing file** - Sets a file with 'hello' (5 bytes), verifies `isDirectory=false`, `size >= 5`, `mtime` is a number
4. **stat returns null for missing file** - Calls stat on non-existent path, verifies null return

All stat tests are guarded with `?.()` since MemoryStorage lacks stat. Size assertion uses `>=` to handle LocalStorageBackend's UTF-16 encoding.

### Test Results
- All 70 tests pass (was 50, now 70 — 4 new × 5 backends)
- All 5 backends: NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend, SQLiteBackend
