# Task Design: Fix OPFSBackend stat() Directory Detection

**Task ID:** task-1775607509331
**Priority:** P1
**Depends on:** None

## Files to Modify/Create

- `src/backends/opfs.ts` — fix `stat()` method
- `test/opfs-stat-isdirectory.test.js` — expand coverage

## Current Code (lines 177-194)

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }> {
  this.validatePath(path)
  try {
    const fh = await this.getFileHandle(path)
    const file = await fh.getFile()
    return { size: file.size, mtime: file.lastModified, isDirectory: false, permissions: { read: true, write: true } }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'TypeMismatchError') {
      try {
        await this.getDirHandle(path)
        return { size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } }
      } catch { throw new NotFoundError(path) }
    }
    if (e instanceof DOMException && e.name === 'NotFoundError') throw new NotFoundError(path)
    if (e instanceof NotFoundError) throw e
    throw new IOError(String(e))
  }
}
```

## Problem

The code tries `getFileHandle(path)` first. For directory paths:
- Some browsers throw `TypeMismatchError` → caught → falls back to `getDirHandle()` → returns `isDirectory: true`. Works.
- Some browsers throw `NotFoundError` → falls to line 190 → throws `NotFoundError`. **Bug: directory treated as missing.**

## Fix: Directory-First Approach

Replace with directory-first detection that eliminates browser-specific `TypeMismatchError` dependency:

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }> {
  this.validatePath(path)
  // Try directory first — avoids browser-specific TypeMismatchError behavior
  try {
    await this.getDirHandle(path)
    return { size: 0, mtime: 0, isDirectory: true, permissions: { read: true, write: true } }
  } catch {}
  // Fall back to file
  try {
    const fh = await this.getFileHandle(path)
    const file = await fh.getFile()
    return { size: file.size, mtime: file.lastModified, isDirectory: false, permissions: { read: true, write: true } }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') throw new NotFoundError(path)
    if (e instanceof NotFoundError) throw e
    throw new IOError(String(e))
  }
}
```

### Why directory-first?

1. **Eliminates browser-specific behavior**: No dependency on whether `getFileHandle()` throws `TypeMismatchError` vs `NotFoundError` for directories.
2. **Simpler logic**: Two clean branches (directory → return, file → return, neither → NotFoundError).
3. **Acceptable performance**: `stat()` is infrequent; one extra async call is negligible.

### Trade-off

For files (the common case), we make one wasted `getDirHandle()` call before succeeding with `getFileHandle()`. This adds ~1ms latency. Acceptable for a filesystem API.

## Test File: `test/opfs-stat-isdirectory.test.js`

Expand existing file with source verification:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('OPFSBackend stat() detects directories', () => {
  const src = readFileSync('src/backends/opfs.ts', 'utf-8')
  const statSection = src.match(/async stat[\s\S]*?^\s{2}\}/m)?.[0]
  assert.ok(statSection?.includes('getDirHandle'), 'stat() should use getDirHandle for directory detection')
  assert.ok(statSection?.includes('isDirectory: true'), 'stat() should return isDirectory: true for directories')
})
```

## Edge Cases

1. **Root `/`**: `getDirHandle('/')` splits to `['']`, calls `dir.getDirectoryHandle('')` → returns root. Returns `{ isDirectory: true }`. ✓
2. **Nested dirs**: `/a/b/c` where all are dirs → first try succeeds. ✓
3. **Non-existent**: Both `getDirHandle` and `getFileHandle` fail → `NotFoundError`. ✓

## Dependencies

None.

## Verification

```bash
node --test test/opfs-stat-isdirectory.test.js
node --test test/cross-backend.test.js  # regression
```
