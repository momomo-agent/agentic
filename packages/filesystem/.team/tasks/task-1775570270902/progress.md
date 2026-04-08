# Add file_delete and file_tree agent tool definitions

## Progress

- Verified `file_delete` and `file_tree` already implemented in `src/filesystem.ts`
- Fixed `SQLiteBackend.stat()` to include `isDirectory: false` (unblocked build)
- All 4 DBB tests pass (DBB-010 through DBB-013)
