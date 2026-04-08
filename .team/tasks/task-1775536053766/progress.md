# Implement localStorage backend

## Progress

- Created `src/backends/local-storage.ts` implementing `StorageBackend`
- Added `LocalStorageBackend` export to `src/index.ts`
- Throws `IOError` if `localStorage` is undefined (non-browser env)
- All paths normalized to leading `/`
