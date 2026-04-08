# M10 DBB — Final DBB Compliance & Coverage Verification

This milestone closes remaining DBB gaps and ensures programmatic coverage verification.

## DBB-M10-001: Coverage threshold enforcement
- Requirement: Coverage report with ≥80% statement coverage
- Given: Run `vitest run --coverage` in the project
- Expect:
  - Coverage report generated successfully
  - Statement coverage ≥ 80%
  - Branch coverage ≥ 75%
  - Exit code 0 if thresholds met, non-zero if below threshold
- Verify: Check vitest.config.ts contains coverage thresholds; CI/test run enforces these programmatically

## DBB-M10-002: Coverage report accessibility
- Requirement: Coverage report is human-readable
- Given: Run `vitest run --coverage`
- Expect: Coverage report shows per-file and overall coverage percentages
- Verify: Report includes statement, branch, function, and line coverage metrics

## DBB-M10-003: mkdir without fs.mkdir support — error handling
- Requirement: mkdir .keep fallback removal
- Given: Filesystem backend does NOT implement `fs.mkdir` method
- When: `mkdir /newdir`
- Expect:
  - Error message: `mkdir: not supported by this filesystem`
  - Exit code non-zero
  - No `.keep` file created as a workaround
  - No side effects (no files or directories created)
- Verify: Check that `/newdir` does not exist and no `.keep` file was written

## DBB-M10-004: mkdir with fs.mkdir support — normal operation
- Requirement: mkdir works when fs.mkdir is available
- Given: Filesystem backend implements `fs.mkdir` method
- When: `mkdir /newdir`
- Expect:
  - Directory `/newdir` created
  - Exit code 0
  - No `.keep` file present in the directory
- Verify: `ls /newdir` succeeds and shows empty directory (or only intended contents)

## DBB-M10-005: grep on non-existent directory
- Requirement: grep error edge case coverage
- Given: Directory `/nonexistent` does not exist
- When: `grep -r pattern /nonexistent`
- Expect:
  - Error message: `grep: /nonexistent: No such file or directory`
  - Exit code non-zero
  - No output to stdout
- Verify: Error follows UNIX format `<command>: <path>: <reason>`

## DBB-M10-006: grep -r with zero matches (empty result)
- Requirement: Distinguish no-match from error
- Given: Directory `/dir` exists with files, but no file contains the pattern
- When: `grep -r "nonexistent-pattern" /dir`
- Expect:
  - Empty output (no lines printed)
  - Exit code 1 (UNIX standard for no match)
  - No error message (this is not an error, just no match)
- Verify: Exit code is 1 (not 0, not other error codes)

## DBB-M10-007: grep -r with matches (positive case)
- Requirement: Verify grep -r still works correctly
- Given: Directory `/dir` with files containing the pattern
- When: `grep -r "pattern" /dir`
- Expect:
  - Matching lines printed to stdout
  - Exit code 0
  - Output format: `<filepath>:<line-content>`
- Verify: All matching lines from all files in the directory tree are returned

## DBB-M10-008: Test suite completeness
- Requirement: All existing tests continue to pass
- Given: Run `vitest run` (full test suite)
- Expect:
  - All 167+ tests pass
  - 0 failures
  - 0 skipped tests
  - Exit code 0
- Verify: Test output shows "Tests passed" summary

## DBB-M10-009: mkdir -p without fs.mkdir support
- Requirement: mkdir -p also fails gracefully without fs.mkdir
- Given: Filesystem backend does NOT implement `fs.mkdir` method
- When: `mkdir -p /a/b/c`
- Expect:
  - Error message: `mkdir: not supported by this filesystem`
  - Exit code non-zero
  - No directories or `.keep` files created
- Verify: `/a`, `/a/b`, `/a/b/c` do not exist

## DBB-M10-010: grep error vs no-match distinction
- Requirement: Clear distinction between error conditions and no-match
- Given: Various grep scenarios
- Expect:
  - File not found → exit code non-zero, error message to stderr
  - Directory not found → exit code non-zero, error message to stderr
  - No matches found → exit code 1, empty stdout, no error message
  - Matches found → exit code 0, matches to stdout
- Verify: Exit codes and output streams are correct for each scenario

## Quality Gates

All M10 DBB items must pass before milestone completion. Additionally:
- Coverage thresholds enforced in vitest.config.ts
- No `.keep` workaround present in mkdir implementation
- Test suite includes explicit tests for all edge cases listed above
- All tests pass with 0 failures
