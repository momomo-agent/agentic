# Architecture mkdir fallback workaround

## Progress

The `mkdirOne` fallback (using `fs.write(path + '/.keep', '')` when `fs.mkdir` is unavailable) was already implemented in `src/index.ts:684-690`. Tests for the fallback already existed in `test/mkdir-no-keep-fallback.test.ts`.

### Changes made:

1. **Fixed stale tests in `src/index.test.ts`** (lines 177-196)
   - Old tests incorrectly expected "mkdir: not supported by this filesystem" when fs.mkdir is unavailable
   - Replaced with correct tests that verify the .keep fallback behavior
   - Added test for `mkdir -p` fallback with .keep for each segment
   - Added permission check test for readOnly fs with fallback

2. **Added permission check test to `test/mkdir-no-keep-fallback.test.ts`**
   - New `DBB-M10-010` describe block
   - Verifies mkdir returns "Permission denied" when fs is readOnly and fs.mkdir is unavailable
   - Confirms .keep fallback is NOT called when permission is denied (checkWritable runs first)

### Test results:
- All new tests pass (7 new tests, 410 total)
- 3 pre-existing failures in glob-recursive.test.ts (unrelated)
- No regressions in mkdir behavior
