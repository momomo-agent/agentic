# Fix unknown command exit code

## Progress

- Changed `exitCodeFor()` line 117: `return 127` → `return 2` for "command not found"
- Updated `test/exit-code-distinction.test.ts` and `test/exit-code-distinction-m15.test.ts` to expect 2
- All 8 exit code distinction tests pass ✓
