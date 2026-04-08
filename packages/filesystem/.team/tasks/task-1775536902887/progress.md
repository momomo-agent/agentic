# Implement directory tree API

## Status: Complete

## Changes
- `src/types.ts`: Added `TreeNode` interface
- `src/filesystem.ts`: Added `tree(prefix?)` method
- `src/index.ts`: Exported `TreeNode` type

## Notes
- Uses `storage.stat()` when available for size/mtime
- Returns `[]` on error (consistent with `ls()`)
- Build: success
