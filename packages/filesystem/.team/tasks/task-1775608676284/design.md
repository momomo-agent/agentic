# Task Design: Expose permissions field in stat() result across all backends

## Status: Already Implemented — Verification & Gap Check Only

Analysis of existing code confirms the permissions field is already implemented in all 6 backends. The remaining work is verification and potential JSDoc gap closure.

## Files to Verify (read-only)

### `src/types.ts` (line 77)
```ts
stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: Permission }>
```
- `Permission` interface defined at line 14: `{ read: boolean; write: boolean }`
- Status: Already correct

### `src/backends/node-fs.ts` (lines 147-165)
```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }>
```
- Reads actual Unix mode bits: `mode & 0o400` for owner read, `mode & 0o200` for owner write
- Status: Already implemented with real permissions

### `src/backends/opfs.ts` (lines 177-194)
- Returns `{ read: true, write: true }` for both files and directories
- Status: Already implemented

### `src/backends/agentic-store.ts` (lines 128-141)
- Returns `{ read: true, write: true }`
- Status: Already implemented

### `src/backends/memory.ts` (lines 97-102)
- Returns `{ read: true, write: true }`
- Status: Already implemented

### `src/backends/local-storage.ts` (lines 140-145)
- Returns `{ read: true, write: true }`
- Status: Already implemented

### `src/backends/sqlite.ts` (lines 145-154)
- Returns `{ read: true, write: true }`
- Status: Already implemented

## Remaining Work

### 1. JSDoc Verification
- Check that `stat()` JSDoc on all backends mentions the `permissions` field
- `StorageBackend` interface in `types.ts` line 73-77: JSDoc says "Size in bytes and mtime as Unix ms" — does NOT mention permissions → **needs update**
- Backend JSDocs vary; some mention permissions, some don't

### 2. Test Verification
- Run `node --test test/m19-stat-permissions.test.js` to confirm existing tests pass
- If test file doesn't exist, create it with:
  - Test each backend's stat() returns `permissions` with correct shape
  - Test NodeFsBackend reads actual mode bits (create a read-only file, verify `write: false`)
  - Test non-filesystem backends return `{ read: true, write: true }`

### 3. Edge Case
- NodeFsBackend: test with a file that has `0o444` (read-only) — `write` should be `false`
- NodeFsBackend: test with a file that has `0o644` (owner writable) — both should be `true`

## Dependencies
- None

## Error Handling
- `stat()` on missing path: `NotFoundError` thrown (already implemented)
- `stat()` on empty path: `IOError('Path cannot be empty')` thrown (already implemented)

## Build/Verify
```bash
npx tsup                                   # build
node --test test/m19-stat-permissions.test.js  # run permissions tests
```
