# Design: Fix grep -i with -l/-c in multi-file mode

## Problem
`src/index.ts:353`: `fs.grep(caseInsensitive ? '' : pattern)` passes empty string when `-i` is set. This causes `fs.grep` to return all lines, then post-filters with regex. The bug: `-c` counts all post-filtered results as a single number (not per-file), and `-l` works but only because path dedup is applied after. The real issue is semantic — `fs.grep` should always get the pattern.

## File to Modify
- `src/index.ts` — `grep()` method, line ~353

## Fix
```typescript
// Before (line 353):
const allResults = await this.fs.grep(caseInsensitive ? '' : pattern)

// After:
const allResults = await this.fs.grep(pattern)
```
The post-filter for `-i` already exists on line ~358 and correctly applies `new RegExp(pattern, 'i')`. No other changes needed.

## Edge Cases
- `grep -i PATTERN file` (single file): uses `grepStream` path, unaffected
- `grep -i -r PATTERN dir/`: multi-file path, fixed by this change
- `grep -i -l PATTERN f1 f2`: fixed — `fs.grep(pattern)` returns only matching lines, `-i` post-filter narrows further
- `grep -i -c PATTERN f1 f2`: fixed — count reflects actual case-insensitive matches

## Test Cases
```typescript
it('grep -i passes pattern to fs.grep in multi-file mode')
it('grep -i -l returns filenames with case-insensitive matches')
it('grep -i -c returns correct count across multiple files')
it('grep -i -r searches recursively case-insensitively')
```
