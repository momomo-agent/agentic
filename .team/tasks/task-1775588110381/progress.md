# Add cross-environment consistency tests

## Progress

- Created `test/cross-env-consistency.test.ts` with 44 tests (22 per backend)
- Tests cover: error format normalization, pipe consistency, exit codes, edge cases, path resolution, rm root safety
- All 506 tests pass (62 test files)
- Found 2 non-blocking bugs: standalone grep exit code, rm -r / exit code
- Task completed 2026-04-08
