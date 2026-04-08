# Implement streaming scan()

## Status: Complete

## Changes
- `src/types.ts`: Added `scanStream()` to `StorageBackend` interface
- All 5 backends: Added `scanStream()` generator, `scan()` now delegates to it
- NodeFsBackend: Uses `readline` + `createReadStream` for true streaming
- Build: success
