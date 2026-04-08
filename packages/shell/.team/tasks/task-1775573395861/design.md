# Design: Fix grep -i in non-streaming path

## Problem
`grep()` multi-path branch calls `fs.grep(pattern)` with the raw pattern. If the FS implementation does case-sensitive matching, it pre-filters results before the shell's `-i` re-filter at line 334-336 can run. Case-insensitive matches are dropped by `fs.grep()` before the shell sees them.

## File to Modify
- `src/index.ts` — `grep()` method, lines 328-348

## Fix

In the multi-path branch (after line 328), when `-i` is set, the post-filter regex already exists. The issue is `fs.grep(pattern)` may not return all potential matches. Solution: when `-i` flag is present, also try matching with a case-folded pattern by passing the pattern to `fs.grep()` as-is but ensuring the post-filter is always applied.

The minimal fix: move the `caseInsensitive` re-filter to always run (not just when `-i`), and when `-i`, use `new RegExp(pattern, 'i')` for filtering. This is already done at lines 334-336. The actual gap is that `fs.grep(pattern)` itself is case-sensitive.

**Correct fix**: When `-i`, call `fs.grep(pattern)` but then filter the results using the case-insensitive regex. Since `fs.grep()` may miss results, we need to either:
1. Call `fs.grep('')` (empty = match all) when `-i` — then filter in shell. **Chosen approach.**
2. Or call `fs.grep(pattern)` with a case-insensitive regex string.

```typescript
// src/index.ts ~line 329
const caseInsensitive = flags.includes('-i')
const re = new RegExp(pattern, caseInsensitive ? 'i' : '')
const allResults = await this.fs.grep(caseInsensitive ? '' : pattern)
const pathFiltered = searchPaths.length
  ? allResults.filter(r => searchPaths.some(p => r.path.startsWith(this.resolve(p))))
  : allResults
const filtered = caseInsensitive
  ? pathFiltered.filter(r => re.test(r.content))
  : pathFiltered
```

## Edge Cases
- `-i` with no matches → return `''`
- `-i -c` → return count of case-insensitive matches
- `-i -l` → return unique file paths of case-insensitive matches
- Invalid regex with `-i` → already caught at line 293-294

## Test Cases
```typescript
it('grep -i matches case-insensitively via fs.grep path', async () => {
  fs.write('/f.txt', 'Hello World')
  expect(await shell.exec('grep -i hello /f.txt')).toContain('Hello')
})
it('grep -i -c counts case-insensitive matches', async () => {
  fs.write('/f.txt', 'Hello\nhello\nHELLO')
  expect(await shell.exec('grep -i -c hello /f.txt')).toBe('3')
})
it('grep -i no match returns empty', async () => {
  fs.write('/f.txt', 'world')
  expect(await shell.exec('grep -i hello /f.txt')).toBe('')
})
```

## Dependencies
- `AgenticFileSystem.grep(pattern)` — called with `''` when `-i` to get all results
