# Task Design: cp -r recursive directory copy

## Status
Implementation already exists. `copyRecursive()` is implemented and called by `cp()` when `-r`/`-R` flag is present. This task requires verifying correctness and adding tests.

## Files to Modify
- `src/index.test.ts` — add cp -r test cases

## Current Implementation (src/index.ts)

`cp()` at line 436:
```typescript
private async cp(args: string[]): Promise<string>
```
- Detects `-r`/`-R` flag, calls `copyRecursive(resolve(src), resolve(dst))`

`copyRecursive()` at line 450:
```typescript
private async copyRecursive(src: string, dst: string): Promise<string>
```
- Calls `fs.ls(src)` — if throws, returns `fsError('cp', src, ...)`
- Creates dst dir via `fs.mkdir(dst)` if available
- Iterates entries: recurses for dirs, read+write for files
- Returns `''` on success, error string on failure

## Gap: Error path uses resolved path
`fsError('cp', src, ...)` in `copyRecursive` uses the resolved absolute path. For user-facing errors, this is acceptable (UNIX tools show absolute paths in errors).

## Test Cases to Add

```typescript
describe('cp -r', () => {
  it('copies directory recursively', async () => {
    // setup: /src/a.txt, /src/sub/b.txt
    // exec: cp -r /src /dst
    // verify: cat /dst/a.txt, cat /dst/sub/b.txt
  })

  it('returns error for non-existent source', async () => {
    // exec: cp -r /nonexistent /dst
    // expect: 'cp: /nonexistent: No such file or directory'
  })

  it('copies deeply nested directory', async () => {
    // setup: 10-level deep tree
    // exec: cp -r /deep /deep-copy
    // verify: find /deep-copy returns all entries
  })

  it('returns error in readOnly mode', async () => {
    // fs.readOnly = true
    // exec: cp -r /src /dst
    // expect: 'cp: /dst: Permission denied'
  })
})
```

## Edge Cases
- Source is a file with `-r`: `fs.ls(src)` throws → `copyRecursive` returns error. Current code returns the error from `copyRecursive`. This is acceptable.
- Empty directory: `fs.ls(src)` returns `[]` → dst created, no files copied → correct.
- `mkdir` not available on fs: skipped silently, files still written (parent path created implicitly by write).

## Dependencies
- `MockFileSystem` must support `ls()` throwing for non-existent paths
- `mkdir` optional on mock
