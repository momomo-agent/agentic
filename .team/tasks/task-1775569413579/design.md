# Design: Fix SQLiteBackend empty path validation and tree tool name

## Files to Modify

1. `src/backends/sqlite.ts` — add empty path guard in `norm()`
2. `src/filesystem.ts` — rename tool `'tree'` → `'file_tree'`

## Changes

### 1. `src/backends/sqlite.ts`

**Function:** `private norm(path: string): string`

Current:
```ts
private norm(path: string): string {
  return path.startsWith('/') ? path : '/' + path
}
```

Updated:
```ts
private norm(path: string): string {
  if (path === '') throw new IOError('Path cannot be empty')
  return path.startsWith('/') ? path : '/' + path
}
```

Matches pattern in `src/backends/node-fs.ts:18`.

### 2. `src/filesystem.ts`

Two locations to update:

- Line ~322: `name: 'tree'` → `name: 'file_tree'`
- Line ~347: `case 'tree':` → `case 'file_tree':`

## Edge Cases

- `norm('')` must throw `IOError('Path cannot be empty')` — not return `'/'`
- All other `norm()` behavior unchanged

## Test Cases

1. `new SQLiteBackend(db).get('')` → throws `IOError`
2. `new SQLiteBackend(db).set('', 'x')` → throws `IOError`
3. `getToolDefinitions()` includes tool with `name === 'file_tree'`
4. `executeTool('file_tree', {})` returns tree result (not error)

## Dependencies

- `IOError` already imported in `src/backends/sqlite.ts`
- No new imports needed
