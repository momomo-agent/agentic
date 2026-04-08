# Fix rm -r deep nesting stack overflow

## Progress

### Findings
- `rmRecursive` at `src/index.ts:718-737` is already iterative (while loop + explicit stack + visited Set)
- No code fix needed — test-only change

### Changes
- Updated `test/rm-deep-nesting.test.ts`:
  - Upgraded 15-level test to 25-level deep tree
  - Upgraded wide directory test from 50 files to 150 entries (100 files + 50 dirs)
  - Added mixed deep+wide tree test with 3 branches (shallow-wide, deep-narrow, deep-wide)
  - Added delete count verification (>40 calls for mixed tree)
  - Kept single-file and cycle detection tests

### Verification
- All 5 tests in rm-deep-nesting.test.ts pass
- Full suite: 397 tests pass, 57 files, 0 failures
