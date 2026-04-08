# Design: Add empty-path validation to OPFSBackend

## File
`src/backends/opfs.ts`

## Change
Add `validatePath` private method (matching NodeFsBackend pattern). Call at top of `get`, `set`, `delete`.

## Logic
```ts
private validatePath(path: string): void {
  if (path === '') throw new IOError('Path cannot be empty')
}
```

Import `IOError` from `'../errors.js'`.

Call `this.validatePath(path)` as first line of `get()`, `set()`, `delete()`.

## Edge Cases
- `path === ''` → throws `IOError('Path cannot be empty')`
- `path === '/'` → passes validation (valid root reference)

## Test Cases
- `get('')` throws IOError with message 'Path cannot be empty'
- `set('', 'x')` throws IOError with message 'Path cannot be empty'
- `delete('')` throws IOError with message 'Path cannot be empty'
