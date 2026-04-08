# Fix grep -i in non-streaming path

## Progress

## Done
- `src/index.ts`: `fs.grep(caseInsensitive ? '' : pattern)` — fetches all when -i, filters with /i regex
- Added `test/grep-i-nonstreaming-m16.test.ts` (3 tests pass)
