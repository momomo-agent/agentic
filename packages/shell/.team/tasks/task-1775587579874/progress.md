# Fix cp without -r on directory error message

## Changes Made

### Source Code
- `src/index.ts` line 741: Changed error from `cp: ${src}: is a directory` to `cp: ${src}: -r not specified; omitting directory`
- Format follows UNIX `cmd: context: message` pattern required by exit code system

### Tests
- Created `test/cp-error.test.ts` with 3 tests (error format, -r still works, file copy regression)
- Updated `test/task-1775574415352.test.ts`: 2 tests updated for new error format
- Updated `test/m14-review.test.ts`: 1 test updated for new error format

## Design Deviations
- Original design suggested `cp: -r not specified; omitting directory '${src}'` format
- Changed to `cp: ${src}: -r not specified; omitting directory` because exit code system (`exitCodeFor`/`isErrorOutput`) requires `cmd: context: message` (two-colon) pattern to return exit code 1
- This keeps the path visible for debugging while matching the system's error detection

## Verification
- All 364 tests pass (54 test files)
- No regressions
