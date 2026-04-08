# Design: Implement stat() on AgenticStoreBackend and OPFSBackend

## Analysis
Both backends already have `stat()` implemented:
- `src/backends/agentic-store.ts`: returns `{size: Blob([value]).size, mtime: Date.now()}` or null
- `src/backends/opfs.ts`: returns `{size: file.size, mtime: file.lastModified}` or null

## Files to Modify
None — implementations already exist.

## Verification Steps
1. Run `npm run build` — confirm no TS errors on stat() signatures
2. Run `npm test` — confirm DBB-006 through DBB-009 pass

## Test Cases
- Write file, call `stat(path)` → `{size > 0, mtime: number}`
- Call `stat('/nonexistent')` → `null`
- Both backends must satisfy same contract as `NodeFsBackend.stat()`
