# Design — Populate File Metadata in LsResult

## Files to Modify
- `src/types.ts` — add `mtime?: number` to `LsResult`; add optional `stat()` to `StorageBackend`
- `src/backends/node-fs.ts` — implement `stat()`
- `src/filesystem.ts` — call `stat()` in `ls()` when available

## Type Changes

### `src/types.ts`
```ts
export interface LsResult {
  name: string
  type: 'file' | 'dir'
  size?: number
  mtime?: number  // epoch ms
}

export interface StorageBackend {
  // ... existing methods ...
  stat?(path: string): Promise<{ size: number; mtime: number } | null>
}
```

## `src/backends/node-fs.ts`
```ts
import { stat } from 'node:fs/promises'

async stat(path: string): Promise<{ size: number; mtime: number } | null> {
  try {
    const s = await stat(this.abs(path))
    return { size: s.size, mtime: s.mtimeMs }
  } catch {
    return null
  }
}
```

## `src/filesystem.ts` — update `ls()`
After building each file `LsResult`, call `this.storage.stat?.(p)` and merge result:
```ts
const meta = await this.storage.stat?.(p)
results.push({ name: p, type: 'file', size: meta?.size, mtime: meta?.mtime })
```
Only call `stat()` for `type: 'file'` entries, not dirs.

## Edge Cases
- `stat()` is optional on `StorageBackend` — other backends omit it, `ls()` uses `?.` call
- Dir entries never get `stat()` called
- `stat()` failure returns `null` — size/mtime remain undefined, no crash

## Test Cases
- NodeFsBackend: write file, call `ls()`, result has `size > 0` and `mtime` is a number
- AgenticStoreBackend: `ls()` returns results with `size === undefined` — no error
