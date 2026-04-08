# Fix OPFSBackend stat() directory detection

## Changes Made

### Source: `src/backends/opfs.ts`
- Rewrote `stat()` to use directory-first approach
- Old: try `getFileHandle()` → catch `TypeMismatchError` → fallback to `getDirHandle()`
- New: try `getDirHandle()` first → if fails, try `getFileHandle()` → if both fail, `NotFoundError`
- Eliminates browser-specific `TypeMismatchError` dependency

### Test: `test/opfs-stat-isdirectory.test.js`
- Updated mock logic to match new directory-first algorithm
- Updated source verification test to assert no `TypeMismatchError` in catch handler
- All 4 unit tests pass

## Verification
- `npx tsup` — build succeeds
- `node --test test/opfs-stat-isdirectory.test.js` — 4/4 pass
- `node --test test/cross-backend.test.js` — 75/75 pass (no regressions)
