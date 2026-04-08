# Task Design: 修复 4 个失败测试

## Objective
Fix 4 failing tests in the test suite, including DBB-017 resolve() path normalization. Ensure all 148+ tests pass.

## Files to Modify
- `src/index.test.ts` — update failing test expectations or add missing test cases
- `src/index.ts` — fix bugs causing test failures (likely in `resolve()` and `normalizePath()`)

## Identified Failing Tests (from test run)

1. `test/dbb.test.ts` — `grep -r` on nonexistent path returns `''` instead of error
2. `test/dbb.test.ts` — `rm /nonexistent` returns `''` instead of error
3. `test/dbb.test.ts` — `cat ./subdir/../file.txt` — `fs.read` called with resolved path, test expects raw path
4. `test/rm-recursive.test.ts` — `rm /tmp/dir` (dir, no -r) returns `''` instead of "is a directory"

## Root Causes & Fixes

### Fix 1: grep -r on nonexistent path (`src/index.ts:grep`, ~line 169)
- `this.fs.grep(pattern)` returns `[]` silently; no existence check on search paths
- **Fix**: After `const filtered = ...`, if `searchPaths.length > 0` and `filtered.length === 0`, check each path with `fs.ls()`; if it throws, return `fsError('grep', path, 'No such file or directory')`

### Fix 2: rm nonexistent file (`src/index.ts:rm`, ~line 320)
- `fs.read()` returns `{ error }` for nonexistent file; code falls through to `fs.delete()` which silently fails
- **Fix**: In non-recursive branch, before the `fs.delete()` call, check: if `r.error` and `lsThrew`, return `fsError('rm', p, r.error)`

### Fix 3: cat path resolution (`test/dbb.test.ts`, DBB-017)
- Test asserts `fs.read` was called with the raw path `./subdir/../file.txt`; `cat` calls `this.resolve()` first
- **Fix**: Update test expectation to match what `resolve('./subdir/../file.txt')` from `/` returns: `/file.txt`
- This is a test expectation bug, not a source bug

### Fix 4: rm directory without -r (`src/index.ts:rm`, ~line 328)
- Condition `if (!lsThrew && !r.error)` is wrong — for a directory, `r.error` IS set (can't read dir as file), so `!r.error` is false, skipping the error return
- **Fix**: Change to `if (!lsThrew)` — if ls succeeded, it's a directory regardless of read result

## Files to Modify
- `src/index.ts` — fixes 1, 2, 4
- `test/dbb.test.ts` — fix 3 (test assertion correction)

## Implementation Steps
1. Fix `rm` directory check: `if (!lsThrew && !r.error)` → `if (!lsThrew)` (line ~328)
2. Fix `rm` nonexistent: add `if (r.error && lsThrew) return fsError('rm', p, r.error)` before delete
3. Fix `grep` nonexistent path: add existence check after filtering
4. Fix test DBB-017: update assertion to expect `/file.txt` not `./subdir/../file.txt`
5. Run full suite, verify 0 failures

## Edge Cases
- resolve() with multiple consecutive `..` segments
- resolve() from root directory (cwd = '/')
- resolve() with trailing slashes
- Test isolation (ensure tests don't interfere with each other)

## Testing Strategy
1. Run full test suite before changes (baseline)
2. Fix one failing test at a time
3. Run full suite after each fix to prevent regressions
4. Final verification: all 148+ tests pass

## Success Criteria
- `npm test` exits with code 0
- 0 test failures reported
- All 148+ tests pass
- DBB-017 resolve() tests specifically pass
