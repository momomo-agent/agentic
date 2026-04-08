# Task Design: mv directory support

## Status
Already implemented in `mv()` at lines 398-434 of `src/index.ts`. This task requires test coverage.

## Files to Modify
- `src/index.test.ts` — add mv directory test cases

## Current Implementation (src/index.ts)

`mv()` at line 398:
1. Tries `fs.ls(srcPath)` — if succeeds, `isDir = true`
2. If dir: calls `copyRecursive(srcPath, dstPath)`, then `rmRecursive(srcPath)`
3. If file: reads content, writes to dst, deletes src

## Test Cases to Add

```typescript
describe('mv directory', () => {
  it('moves directory to new location', async () => {
    // setup: /src/a.txt
    // exec: mv /src /dst
    // verify: cat /dst/a.txt succeeds, ls /src throws
  })

  it('renames directory', async () => {
    // setup: /oldname/file.txt
    // exec: mv /oldname /newname
    // verify: cat /newname/file.txt succeeds
  })

  it('returns error for non-existent source', async () => {
    // exec: mv /nonexistent /dst
    // expect: 'mv: /nonexistent: No such file or directory'
  })

  it('returns Permission denied in readOnly mode', async () => {
    // fs.readOnly = true; setup: /src/a.txt
    // exec: mv /src /dst
    // expect: 'mv: /src: Permission denied'
  })
})
```

## Edge Cases
- Non-existent source: `fs.ls(srcPath)` throws → `isDir = false` → falls to file path → `fs.read(srcPath)` returns error → `fsError('mv', src, r.error)`. Correct.
- Source is file (not dir): `fs.ls` throws → file path taken. Correct.

## Dependencies
- `MockFileSystem` must support `ls()` throwing for non-existent paths
- `rmRecursive` must work correctly (covered by rm -r tests)
