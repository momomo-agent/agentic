# Exit codes for all commands

## Progress

### Status: Complete

- `exec()` return type changed to `{ output: string; exitCode: number }` — already in src/index.ts
- `exitCodeFor()` helper implemented (exit 2 for missing operand/pattern/command not found, exit 1 for UNIX error format, exit 0 otherwise)
- Added DBB-m12-001 to DBB-m12-005 test cases in src/index.test.ts
- Updated all 23 test files in test/ to use `.output` on exec results (232 call sites)
- All 181 tests pass
