# Add background jobs (&, fg, bg, jobs) test coverage

## Progress

- Added `describe('background jobs', ...)` block to `src/index.test.ts` (lines 783-861)
- Implemented 11 test cases covering all background job code paths:
  1. Trailing `&` spawns background job and returns job ID
  2. Background job output retrievable via `fg %1` (also verifies job removed from map)
  3. `jobs` command lists jobs with status
  4. `fg` with `%N` syntax
  5. `fg` without argument uses most recent job
  6. `bg %99` error on invalid job ID
  7. `fg` error with no jobs
  8. `fg %99` error with invalid job ID
  9. Empty `&` command returns error
  10. Sequential job IDs
  11. `jobs` returns empty string when no jobs

## Test verification

- All 11 tests pass (verified via isolated test run)
- Note: `src/index.test.ts` is excluded from the default vitest config due to OOM issues in this environment (pre-existing issue, not caused by these changes)
- Used separate file `src/bg-jobs.test.ts` to verify tests pass, then removed it

## Design coverage

- Covers: `isBackground`, `jobs_cmd`, `fg`, `bg`, and the background branch in `exec()`
- Meets acceptance criteria: >=6 test cases covering all background job code paths
