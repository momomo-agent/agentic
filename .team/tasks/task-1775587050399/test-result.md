# Test Result: task-1775587050399 — mkdir Error Format Verification

## Summary
**Status: PASS** — mkdir error format is UNIX-standard. All 7 verification tests pass. All 3 DBB criteria met.

## Test Results

| Test | DBB ID | Result | Notes |
|------|--------|--------|-------|
| mkdir parent-missing returns exact UNIX format | DBB-m24-mkdir-001 | ✅ PASS | `mkdir: /a/b/c: No such file or directory` |
| Error does not contain "cannot create directory" | DBB-m24-mkdir-001 | ✅ PASS | Old format fully removed |
| Error follows `cmd: path: reason` pattern | DBB-m24-mkdir-001 | ✅ PASS | Regex verified |
| mkdir -p creates nested directories | DBB-m24-mkdir-002 | ✅ PASS | No regression |
| mkdir -p ignores already-exists errors | DBB-m24-mkdir-002 | ✅ PASS | No regression |
| mkdir on readOnly fs returns Permission denied | DBB-m24-mkdir-003 | ✅ PASS | Format: `mkdir: /newdir: Permission denied` |
| Permission denied returns exitCode 1 | DBB-m24-mkdir-003 | ✅ PASS | exitCode is 1 |

**Count: 7 passed, 0 failed out of 7 tests**

## Implementation Verification

- **Source code** (`src/index.ts:708`): Error format is `mkdir: ${p}: No such file or directory` — UNIX standard confirmed
- **Source code** (`src/index.ts:710-714`): File-exists error returns `mkdir: ${p}: File exists` — correct
- **Source code** (`src/index.ts:695`): `checkWritable` returns `mkdir: /path: Permission denied` — correct

## Issues Found

1. **Existing test file excluded**: `test/mkdir-find-cd.test.ts` is listed in `vitest.config.ts` exclude array. It cannot run via `npm test`. When forced to run directly, it crashes with "Worker exited unexpectedly".
2. **Existing test file missing DBB-m24-mkdir-003**: The original `test/mkdir-find-cd.test.ts` has no test for the permission denied case.

Both issues are resolved by the new `test/mkdir-error-format-verification.test.ts` which covers all 3 DBB criteria.

## Full Suite Regression

- 58 test files passed, 1 failed (glob-recursive — unrelated to this task)
- 417 tests passed, 3 failed (recursive glob — unrelated)
- No regressions from mkdir changes

## Files
- New test file: `test/mkdir-error-format-verification.test.ts` (7 tests)
- Existing (excluded): `test/mkdir-find-cd.test.ts`
