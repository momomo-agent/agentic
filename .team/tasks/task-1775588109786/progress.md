# Fix grep -i multi-file/recursive inconsistency

## Progress

- Implementation was **already in place** in `src/index.ts` (lines 576-622): case-insensitive bypass that reads files directly instead of using the case-sensitive `fs.grep()`.
- Added **8 new tests** in `test/grep-i-consistency.test.ts`:
  1. `grep -i` multi-file matches case-insensitively
  2. `grep -il` multi-file returns correct files
  3. `grep -ic` multi-file returns correct count
  4. `grep -ir` recursive matches case-insensitively
  5. `grep -ilr` recursive returns correct files
  6. `grep -icr` recursive returns correct count
  7. `grep -i` with no match returns empty
  8. `grep -i` on non-existent file returns error

## Test results

- All 8 new tests pass
- Full suite: 60 test files, 450 tests (all passing)

## Notes

- Tests placed in `test/` (not `src/index.test.ts`) because the main test file is excluded from vitest due to OOM.
- Single-file `-i` tests go through `grepStream` path (not the bypass), which shows a "streaming unavailable" warning with mock fs. Multi-file/recursive tests correctly hit the case-insensitive bypass.
