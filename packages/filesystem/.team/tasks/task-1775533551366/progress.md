# Implement batchGet and batchSet operations

## Progress

- Added `batchGet`/`batchSet` to `StorageBackend` interface in `src/types.ts`
- Implemented in `NodeFsBackend`, `OPFSBackend`, `AgenticStoreBackend` via `Promise.all`
- Build passes: `npm run build` ✓
