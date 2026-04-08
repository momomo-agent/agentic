# Glob pattern support in ls and grep

## Progress

## Completed
- Added `matchGlob` and `expandGlob` private methods to `src/index.ts`
- Updated `ls()` to detect glob chars and expand before listing
- Updated `grep()` to expand glob patterns in file args
- Added 5 tests in `test/glob-pattern-m12.test.ts` (DBB-m12-010 to 014)
- 205/205 tests passing

