# Add JSDoc to all backend class methods

## Changes Made

### Source changes (class-level JSDoc added to 5 backends):
- `src/backends/memory.ts` — Added class-level JSDoc for MemoryStorage
- `src/backends/agentic-store.ts` — Added class-level JSDoc for AgenticStoreBackend
- `src/backends/opfs.ts` — Added class-level JSDoc for OPFSBackend
- `src/backends/node-fs.ts` — Added class-level JSDoc for NodeFsBackend
- `src/backends/local-storage.ts` — Added class-level JSDoc for LocalStorageBackend

SQLiteBackend already had class-level JSDoc — no change needed.

### Test changes:
- `test/jsdoc.test.js` — Extended with:
  - Class-level JSDoc assertions for all 6 backends
  - Method-level JSDoc assertions for all 9 methods (get, set, delete, list, scan, scanStream, batchGet, batchSet, stat) across all 6 backends
  - Increased lookback window from 200 to 400 chars for backend method detection (some JSDoc blocks were longer than 200 chars)

## Verification
- `npx tsup` — build succeeds
- `node --test test/jsdoc.test.js` — 72/72 tests pass
- `node --test test/*.test.js` — 516/516 tests pass (full suite)
