# Task Design: Standardize error handling across backends — typed throws vs silent swallow

## Files to Modify

| File | Change |
|------|--------|
| `src/backends/agentic-store.ts` | Change `stat()` to throw `NotFoundError` for missing, `IOError` for I/O failures |
| `src/backends/opfs.ts` | Change `stat()` to throw `NotFoundError` for missing |
| `src/backends/node-fs.ts` | Change `stat()` to throw `NotFoundError` for missing (ENOENT) |
| `src/backends/sqlite.ts` | Change `stat()` to throw `NotFoundError` for missing, `IOError` for I/O failures |
| `src/backends/memory.ts` | Add `stat()` with `NotFoundError` for missing |
| `src/backends/local-storage.ts` | Add `stat()` with `NotFoundError` for missing |
| `src/filesystem.ts` | Update `ls()` and `tree()` to catch `NotFoundError` from `stat()` |
| `test/cross-backend.test.js` | Add error propagation tests |

## Problem Analysis

PRD §3 DBB-004 requires: `stat()` throws `NotFoundError` for missing files (not return `null`), and `IOError` for I/O failures. Some backends currently return `null` for missing or silently swallow errors.

### Per-Backend Changes

#### AgenticStoreBackend.stat() (line 85-95)

Change `if (value == null) return null` → `if (value == null) throw new NotFoundError(path)`
Change `catch { return null }` → catch that re-throws NotFoundError, wraps others as IOError

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }> {
  this.validatePath(path)
  try {
    const p = this.normPath(path)
    const value = await this.store.get(p)
    if (value == null) throw new NotFoundError(path)
    const mtimeRaw = await this.store.get(p + '\x00mtime')
    const mtime = mtimeRaw ? Number(mtimeRaw) : 0
    return { size: new Blob([String(value)]).size, mtime, isDirectory: false, permissions: { read: true, write: true } }
  } catch (e) {
    if (e instanceof NotFoundError) throw e
    throw new IOError(String(e))
  }
}
```

#### OPFSBackend.stat() (lines 134-149)

Currently returns `null` when file/dir not found. Change to throw `NotFoundError`.

#### NodeFsBackend.stat() (line 104-111)

Currently catches all errors and returns `null`. Change to detect ENOENT → `throw new NotFoundError(path)`, other errors → `throw new IOError(...)`.

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } }> {
  this.validatePath(path)
  try {
    const s = await stat(this.abs(path))
    const read = !!(s.mode & 0o400)
    const write = !!(s.mode & 0o200)
    return { size: s.size, mtime: s.mtimeMs, isDirectory: s.isDirectory(), permissions: { read, write } }
  } catch (e: any) {
    if (e.code === 'ENOENT') throw new NotFoundError(path)
    throw new IOError(String(e))
  }
}
```

#### SQLiteBackend.stat() (line 102-107)

Change `row == undefined` → `throw new NotFoundError(path)`. Change `catch { return null }` → catch that re-throws/throws IOError.

#### MemoryStorage.stat() (new method from task-1775586676543)

`value === undefined` → `throw new NotFoundError(path)` instead of `return null`.

#### LocalStorageBackend.stat() (new method from task-1775586676543)

`content === null` → `throw new NotFoundError(path)` instead of `return null`.

## Implementation Steps

### Step 1: Add `NotFoundError` import to backends that lack it

- `src/backends/agentic-store.ts` — add `NotFoundError` to `import { IOError } from '../errors.js'`
- `src/backends/node-fs.ts` — add `NotFoundError` to import
- `src/backends/sqlite.ts` — add `NotFoundError` to import
- `src/backends/memory.ts` — add `import { NotFoundError, IOError } from '../errors.js'`
- `src/backends/local-storage.ts` — add `NotFoundError` to import

### Step 2: Change stat() on all backends to throw NotFoundError for missing files

Apply the per-backend patterns described above. Return type no longer includes `| null`.

### Step 3: Update callers in `src/filesystem.ts`

#### `ls()` method (lines 117-119):
```ts
// Before:
const meta = await this.storage.stat?.(p)
results.push({ name: p, type: 'file', size: meta?.size, mtime: meta?.mtime })

// After:
let meta = null
try { meta = await this.storage.stat?.(p) } catch { /* NotFoundError: file deleted between list() and stat() */ }
results.push({ name: p, type: 'file', size: meta?.size, mtime: meta?.mtime })
```

#### `tree()` method (line 150):
Same pattern — wrap `stat?.(p)` in try/catch.

### Step 4: Add error propagation tests

In `test/cross-backend.test.js`:
```ts
test(`${name}: stat throws NotFoundError for missing path`, async () => {
  await assert.rejects(
    () => backend.stat('/nonexistent.txt'),
    (err: any) => err.name === 'NotFoundError'
  )
})

test(`${name}: stat with empty path throws IOError`, async () => {
  if (backend.stat) {
    await assert.rejects(() => backend.stat!(''), (err: any) => err.name === 'IOError')
  }
})
```

## Edge Cases

- **`get()` contract unchanged**: `get()` still returns `null` for missing files (read-optional pattern). Only `stat()` changes.
- **`delete()` contract unchanged**: `delete()` still resolves without throw for missing files.
- **Race condition in `ls()`/`tree()`**: file listed by `list()` but deleted before `stat()` → catch NotFoundError, return entry without metadata.
- **Existing callers of `stat()`**: any code checking `stat() === null` must be updated to catch `NotFoundError`.

## Dependencies

- Depends on task-1775586676543 (adds `stat()` to Memory/LocalStorage with permissions). Run after that task completes.
- Must complete before task-1775586679805 (cross-backend tests verify error behavior).

## Test Cases

1. `stat('/nonexistent')` rejects with `NotFoundError` on all backends
2. `stat('/existing')` returns `{ size, mtime, isDirectory, permissions }` (no regression)
3. `stat('')` throws `IOError` on all backends
4. `get('/nonexistent')` still returns `null` (unchanged)
5. `delete('/nonexistent')` still resolves without throw (unchanged)
6. `ls()` and `tree()` still work when stat throws (graceful degradation)
