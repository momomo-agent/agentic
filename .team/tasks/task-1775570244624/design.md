# Design: Implement stat() with isDirectory on AgenticStoreBackend and OPFSBackend

## Problem
`stat()` on both backends returns `{size, mtime}` but the vision/DBB requires `{size, mtime, isDirectory}`.
`StorageBackend` interface in `types.ts` also needs updating.

## Files to Modify

### `src/types.ts`
- Update `stat?()` return type:
  ```ts
  stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null>
  ```

### `src/backends/agentic-store.ts`
- `stat()` currently returns `{ size, mtime }` — add `isDirectory: false`
  (AgenticStore only stores files, never directories)
  ```ts
  return { size: new Blob([String(value)]).size, mtime: Date.now(), isDirectory: false }
  ```

### `src/backends/opfs.ts`
- `stat()` currently returns `{ size: file.size, mtime: file.lastModified }` — add `isDirectory: false`
  (OPFS getFileHandle only resolves for files)
  ```ts
  return { size: file.size, mtime: file.lastModified, isDirectory: false }
  ```

## Edge Cases
- Missing path: both backends already return `null` — no change needed
- `isDirectory` is always `false` for file-only backends (no directory entries stored)

## Test Cases
- `stat('/existing')` returns `{size: number, mtime: number, isDirectory: false}`
- `stat('/missing')` returns `null`
