# Task Design: Implement basic permissions system

## Files to Modify
- `src/filesystem.ts` — add permission storage, `setPermission()`, and enforcement in `read()`/`write()`/`delete()`
- `src/types.ts` — add `Permission` interface and `FileSystemConfig.permissions` option

## New Types

```ts
// src/types.ts
export interface Permission {
  read: boolean
  write: boolean
}

// extend FileSystemConfig
export interface FileSystemConfig {
  storage: StorageBackend
  embed?: EmbedBackend
  readOnly?: boolean
  permissions?: Record<string, Permission>  // initial permission map, keyed by path prefix or exact path
}
```

## Function Signatures

```ts
// src/filesystem.ts
setPermission(path: string, perm: Permission): void
private checkPermission(path: string, op: 'read' | 'write'): void  // throws PermissionDeniedError
```

## Algorithm

### Storage
- `private permissions: Map<string, Permission>` initialized from `config.permissions` in constructor

### `setPermission(path, perm)`
- Normalizes path (ensure leading `/`)
- Sets `this.permissions.set(path, perm)`

### `checkPermission(path, op)`
- Exact match first: `this.permissions.get(path)`
- Prefix match: find longest key in map where `path.startsWith(key + '/')` or `path === key`
- If match found and `perm[op] === false` → throw `PermissionDeniedError(path)`
- No match → allow (default permit)

### Enforcement
- `read()`: call `checkPermission(path, 'read')` before `storage.get()`; catch `PermissionDeniedError` → return `{ path, error }`
- `write()`: call `checkPermission(path, 'write')` after readOnly check
- `delete()`: call `checkPermission(path, 'write')` after readOnly check

## Edge Cases
- `readOnly: true` takes precedence over permissions for write ops
- Prefix `/docs` applies to `/docs/a.txt` but not `/documents/b.txt`
- Setting permission on a path overrides any parent prefix match (exact match wins)

## Dependencies
- `PermissionDeniedError` from `src/errors.ts` (already exists)
- No backend changes required

## Test Cases
- `read()` on path with `read: false` returns error
- `write()` on path with `write: false` returns error
- `delete()` on path with `write: false` returns error
- Prefix permission applies to all children
- Exact path permission overrides prefix
- Default (no permission set) allows all ops
- `readOnly` still blocks writes even if permission allows
