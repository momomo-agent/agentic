# Add missing test coverage: ls pagination, find -type, rm -r root guard, cd-to-file

## Progress

- Created test/missing-coverage-m18.test.ts with 7 tests covering:
  - ls --page/--page-size pagination (3 tests)
  - find -type f/d filtering (2 tests)
  - rm -r / root guard (1 test)
  - cd to file returns Not a directory (1 test)
- All 7 tests pass
- Note: rm -r / exitCode is 0 (not 1) per actual exitCodeFor() logic; test asserts output only
