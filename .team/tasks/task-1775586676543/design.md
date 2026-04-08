# Task Design: Add permissions field to stat() result across all backends

## Files to Modify

| File | Change |
|------|--------|
| `src/types.ts` | Add `permissions` to `stat()` return type |
| `src/backends/agentic-store.ts` | Add `permissions` to `stat()` return |
| `src/backends/opfs.ts` | Add `permissions` to `stat()` return |
| `src/backends/node-fs.ts` | Add `permissions` to `stat()` return |
| `src/backends/memory.ts` | Add `stat()` method |
| `src/backends/sqlite.ts` | Add `permissions` to `stat()` return |
| `src/backends/local-storage.ts` | Add `stat()` method |

## Type Changes

In `src/types.ts`, change the `stat()` signature:

```ts
// Before
stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null>

// After
stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } } | null>
```

Note: The `Permission` type already exists in `types.ts` as `{ read: boolean; write: boolean }`. Reuse it in the return type.

## Per-Backend Implementation

### AgenticStoreBackend (src/backends/agentic-store.ts:85-95)

Add `permissions: { read: true, write: true }` to the return object at line 93:

```ts
return { size: new Blob([String(value)]).size, mtime, isDirectory: false, permissions: { read: true, write: true } }
```

### OPFSBackend (src/backends/opfs.ts:134-149)

Add `permissions: { read: true, write: true }` to both return paths:
- Line 139 (file stat): add `permissions: { read: true, write: true }`
- Line 144 (directory stat): add `permissions: { read: true, write: true }`

### NodeFsBackend (src/backends/node-fs.ts:104-111)

Compute permissions from filesystem mode:

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } } | null> {
  try {
    const s = await stat(this.abs(path))
    const mode = s.mode
    return {
      size: s.size,
      mtime: s.mtimeMs,
      isDirectory: s.isDirectory(),
      permissions: {
        read: !!(mode & 0o400),  // owner read bit
        write: !!(mode & 0o200), // owner write bit
      }
    }
  } catch {
    return null
  }
}
```

### MemoryStorage (src/backends/memory.ts) — NEW METHOD

Add `stat()` method. MemoryStorage currently has no `stat()`:

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } } | null> {
  this.validatePath(path)
  const value = this.store.get(path)
  if (value === undefined) return null
  return { size: value.length, mtime: 0, isDirectory: false, permissions: { read: true, write: true } }
}
```

### SQLiteBackend (src/backends/sqlite.ts:102-107)

Add `permissions: { read: true, write: true }` to the return at line 105:

```ts
return row ? { size: row['size'] as number, mtime: row['mtime'] as number, isDirectory: false, permissions: { read: true, write: true } } : null
```

### LocalStorageBackend (src/backends/local-storage.ts) — NEW METHOD

Add `stat()` method. LocalStorageBackend currently has no `stat()`:

```ts
async stat(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean; permissions: { read: boolean; write: boolean } } | null> {
  this.validatePath(path)
  const content = this.storage().getItem(this.key(path))
  if (content === null) return null
  return { size: content.length, mtime: 0, isDirectory: false, permissions: { read: true, write: true } }
}
```

## Edge Cases

- `stat()` on missing path: return `null` in this task (task-1775586684332 will change to throw `NotFoundError`)
- `stat('')`: throw `IOError` (unchanged, `validatePath` handles it)
- `MemoryStorage` and `LocalStorageBackend` mtime is `0` (no modification tracking)
- `NodeFsBackend` uses real OS permission bits; other backends return `{ read: true, write: true }`

## Note on stat() null-return contract

This task preserves the current `stat()` contract (return `null` for missing paths). Task-1775586684332 will change `stat()` to throw `NotFoundError` for missing files as specified in DBB-004. The two changes are designed to be applied sequentially.

## Dependencies

- None. The `Permission` type is already defined in `types.ts`.
- Must complete before task-1775586679805 (cross-backend tests) so tests can assert `permissions`.

## Test Cases

1. Each backend's `stat()` returns `permissions` with `read` and `write` boolean fields
2. `NodeFsBackend.stat()` returns `{ read: true, write: true }` for a newly created file
3. `MemoryStorage.stat('/missing')` returns `null`
4. `LocalStorageBackend.stat('/missing')` returns `null`
5. `MemoryStorage.stat('')` throws `IOError`
6. Cross-backend test: `stat()` result includes `permissions` field
