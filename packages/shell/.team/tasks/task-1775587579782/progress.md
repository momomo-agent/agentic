# Implement recursive glob and bracket expressions

## Progress

### Implementation Complete

1. **Added `expandRecursiveGlob()` method** (src/index.ts)
   - Stack-based DFS traversal with visited set to prevent symlink loops
   - Iterates through all subdirectories from baseDir
   - Matches each entry name against the glob pattern using existing `matchGlob()`

2. **Updated `expandGlob()`** (src/index.ts)
   - Added `**` detection before the original single-directory logic
   - Splits pattern into prefix (before `**`) and suffix (after `**/`)
   - Resolves prefix to get base directory, calls `expandRecursiveGlob()` with suffix pattern
   - Falls through to original logic for non-recursive patterns (no regression)

3. **Tests already existed** — test/glob-recursive.test.ts had 6 tests covering all DBB criteria

### Test Results
- `test/glob-recursive.test.ts`: 6/6 passed
- Full suite: 442/442 passed, 0 regressions

### Design Notes
- No changes needed to `expandPathArgs()` — `**` contains `*` so existing filter works
- No changes needed to `matchGlob()` — bracket expressions already handled correctly
