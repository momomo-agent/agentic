# Fix cp without -r on directory

## Progress

- Fixed `src/index.ts:560`: removed ` (use -r)` suffix from cp error message
- Error now: `cp: <path>: is a directory` (UNIX standard)
- Added test in `src/index.test.ts` — verifies output and exitCode 1
- Test passes ✓
