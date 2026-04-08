# m23 — Test Failures & Spec Alignment

## Goals
Fix the 3 remaining concrete test failures to bring pass rate from 321/329 to 326/329 (excluding 2 OOM test files). Align implementation with architecture spec on pipe behavior.

## Scope
1. Fix pipe error propagation — failed left command should pass empty stdin to right command (architecture spec compliance)
2. Fix wc output format — use tab separators and include filename (DBB-wc-001, DBB-m14-wc-001, DBB-m13-008)
3. Fix cp without -r on directory error message format (DBB-m11-004)

## Acceptance Criteria
- `false_cmd | grep pattern` passes empty string as stdin, returns grep's no-match result (not short-circuit)
- `wc /file` returns `2\t3\t10\t/file` (tab-separated with filename)
- `cp dir/ dest` (without -r) returns consistent error message matching DBB spec
- All 3 fixes have corresponding tests
- Test pass rate: 326/329 (excluding 2 OOM files)

## Blocked By
None — these are independent fixes.
