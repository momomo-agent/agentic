# Expose batchGet/batchSet/scanStream as AgenticFileSystem public methods

## Progress

## Status: Complete

## What was done
- Verified that `batch_get`, `batch_set`, and `grep_stream` tool definitions already exist in `src/filesystem.ts` (lines 363-405)
- Verified that `executeTool()` handlers already exist for all three (lines 424-434)
- Added 7 new tests to `test/agent-tools-dbb.test.js`:
  - DBB-020: Tool definitions present for batch_get, batch_set, grep_stream
  - DBB-021: batch_get reads multiple files
  - DBB-022: batch_get returns null for missing paths
  - DBB-023: batch_set writes multiple files
  - DBB-024: batch_set throws PermissionDeniedError on readOnly filesystem
  - DBB-025: grep_stream returns matching lines
  - DBB-026: grep_stream returns empty array for no matches

## Test results
- All 11 tests pass (4 existing + 7 new)
- Build succeeds with `npx tsup`

## Notes
- This was a test-only change — all source code was already implemented
- Used `MemoryStorage()` for isolated test instances per test case
