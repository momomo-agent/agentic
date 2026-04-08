# m24 — PRD Test Coverage & Error Format Fixes

## Goals
Close PRD compliance gaps by adding test coverage for implemented-but-untested features and fixing error message format inconsistencies. Target: raise PRD match from 75% toward 90%.

## Scope
1. **ls pagination tests** — add test coverage for `--page` and `--page-size` flags (PRD gap: "no test coverage for pagination behavior")
2. **find -type tests** — add test coverage for `-type f` and `-type d` filtering (PRD gap: "no test coverage")
3. **rm -r root safety test** — add test that rm -r refuses to delete root `/` (PRD gap: "implemented but no test coverage")
4. **cd to file test** — add test for cd to a file path returning "Not a directory" (PRD gap: "implemented but no test coverage")
5. **Path resolution unit tests** — add dedicated tests for `../` boundary behavior, normalizePath edge cases (PRD gap: "no dedicated test cases")
6. **mkdir error format fix** — standardize mkdir error to UNIX format: `mkdir: X: No such file or directory` instead of current `mkdir: cannot create directory X: ...` (PRD gap: "error format mismatch")
7. **Cross-environment consistency tests** — verify shell behavior across browser/Electron/Node environments covering fs backend differences, path resolution, error format (PRD gap: "no browser/Electron/Node cross-env test suite")
8. **Test coverage quality gate** — run coverage measurement, verify ≥80% statement / ≥75% branch coverage, confirm ≥148 tests (PRD gap: "coverage not measured")

## Acceptance Criteria
- All 7 items have passing test cases
- Test pass rate ≥ 326/329 (excluding 2 OOM files)
- mkdir error format matches UNIX standard
- PRD match score improves measurably

## Progress
- **Done:** Test coverage quality gate (≥80% statement, ≥75% branch — confirmed at 93.51%)
- **Review:** mkdir error format verification test
- **Todo:** 6 test coverage tasks (ls, find, rm -r, cd, path resolution, cross-env)

## Blocked By
- m23 (wc/cp fixes) completed — clean test baseline confirmed (396/396 passing)
