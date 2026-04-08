# Design: mv directory support

## Status
Directory move is already implemented in `src/index.ts:409-445`.

The `mv()` method:
1. Detects if src is a directory via `fs.ls(srcPath)` (try/catch)
2. If dir: calls `copyRecursive(srcPath, dstPath)` then `rmRecursive(srcPath)`
3. If file: reads content, writes to dst, deletes src

All DBB scenarios (DBB-m11-005, 006, 007) are already covered by existing code.

## No Code Changes Required

## Tests to Add: src/index.test.ts

```
describe('mv directory', () => {
  it('moves directory to new path, src no longer exists')     // DBB-m11-005
  it('moves directory into existing destination')             // DBB-m11-006
  it('errors on non-existent source directory')               // DBB-m11-007
})
```

### Test setup pattern
```typescript
// DBB-m11-005
fs.writeSync('/srcdir/a.txt', 'hello')
fs.writeSync('/srcdir/sub/b.txt', 'world')
await shell.exec('mv /srcdir /dstdir')
// assert /dstdir/a.txt exists, /srcdir does not
```

## Edge Cases
- Non-existent src: `fs.ls()` throws → caught in file branch → `fs.read()` returns error → `fsError('mv', src, r.error)`
- `rmRecursive` failure after copy: returns error string from catch block
