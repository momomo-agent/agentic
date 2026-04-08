# M29 DBB — Vision Gap Closure (70% → ≥90%)

## Quality Gates

- All 9 architecture-alignment-m28 test cases pass
- Vision gap score ≥ 90% (from current 70%)
- Architecture gap score ≥ 90% (from current 88%)
- Standalone grep no-match returns exit code 1 (UNIX standard)
- At least 1 Node.js filesystem integration test file exists and all tests pass

---

## A. Standalone grep Exit Code (T2)

### DBB-m29-grep-001: Standalone grep no-match returns exit code 1
- Requirement: T2 — Fix standalone grep no-match exit code
- Given: file `/f.txt` contains "hello" and "world", no line contains "xyz"
- When: `grep "xyz" /f.txt`
- Expect: empty output, exit code 1
- Verify: exit code matches UNIX convention (1 = no match)

### DBB-m29-grep-002: Standalone grep match returns exit code 0
- Requirement: T2
- Given: file `/f.txt` contains "hello"
- When: `grep "hello" /f.txt`
- Expect: output contains "hello", exit code 0
- Verify: exit code 0 for successful match

### DBB-m29-grep-003: Standalone grep -i no-match returns exit code 1
- Requirement: T2
- Given: file `/f.txt` contains "hello"
- When: `grep -i "xyz" /f.txt`
- Expect: empty output, exit code 1
- Verify: case-insensitive flag does not change no-match exit code

### DBB-m29-grep-004: Standalone grep on non-existent file
- Requirement: T2
- Given: `/nonexistent` does not exist
- When: `grep "pattern" /nonexistent`
- Expect: error message contains path, exit code non-zero (1)
- Verify: error case still produces correct exit code

### DBB-m29-grep-005: Pipe grep no-match still returns exit code 1
- Requirement: T2
- Given: file `/f.txt` contains "hello"
- When: `cat /f.txt | grep "xyz"`
- Expect: empty output, exit code 1
- Verify: pipe case was already correct — regression check

### DBB-m29-grep-006: Input redirect grep no-match returns exit code 1
- Requirement: T2
- Given: file `/f.txt` contains "hello"
- When: `grep "xyz" < /f.txt`
- Expect: empty output, exit code 1
- Verify: input redirect case was already correct — regression check

### DBB-m29-grep-007: Standalone grep with invalid regex
- Requirement: T2
- Given: file `/f.txt` exists
- When: `grep "[invalid" /f.txt`
- Expect: error message about invalid pattern, exit code 2
- Verify: invalid regex still produces exit code 2 (not affected by fix)

---

## B. Architecture Alignment Tests (T1 + T4)

### DBB-m29-arch-001: architecture-alignment-m28 tests pass
- Requirement: T1 — Update ARCHITECTURE.md
- Given: ARCHITECTURE.md updated and architecture.json updated
- When: `vitest run test/architecture-alignment-m28.test.ts`
- Expect: all 9 test cases pass (0 failures)
- Verify: previously failing tests for exit code documentation, glob, redirection, env vars, command substitution now pass

### DBB-m29-arch-002: ARCHITECTURE.md no longer lists implemented features as future
- Requirement: T1
- Given: ARCHITECTURE.md has been updated
- When: inspecting the "Future Enhancements" section
- Expect: Glob pattern support, Redirection, Environment variables, Command substitution, and Background jobs are NOT listed as future — they are documented as implemented
- Verify: `grep -A 20 "Future Enhancements" ARCHITECTURE.md` does not contain these items

### DBB-m29-arch-003: ARCHITECTURE.md documents exit codes as implemented
- Requirement: T1
- Given: ARCHITECTURE.md has been updated
- When: inspecting exit code documentation
- Expect: document describes {output, exitCode} return type with 0/1/2 codes — does NOT contain "not currently implemented"
- Verify: `grep "not currently implemented" ARCHITECTURE.md` returns no match

### DBB-m29-arch-004: ARCHITECTURE.md line count updated
- Requirement: T1
- Given: ARCHITECTURE.md has been updated
- When: inspecting file size documentation
- Expect: references ~970 lines (or actual count) instead of ~400 lines
- Verify: architecture-alignment test for line count passes

### DBB-m29-arch-005: Architecture match score ≥ 90%
- Requirement: T4 — Re-run vision gap analysis
- Given: ARCHITECTURE.md updated and architecture.json regenerated
- When: reading `.team/gaps/architecture.json`
- Expect: `match` field ≥ 90
- Verify: no major severity gaps remain

---

## C. Node.js Integration Tests (T3)

### DBB-m29-int-001: Integration test file exists
- Requirement: T3 — Add Node.js filesystem integration tests
- Given: test directory exists at `test/`
- When: listing test files
- Expect: a file matching `*node*integration*` or `*node-fs*` exists under `test/`
- Verify: file is non-empty and imports vitest

### DBB-m29-int-002: Integration tests use real filesystem
- Requirement: T3
- Given: integration test file exists
- When: inspecting test setup
- Expect: uses real Node.js `fs` module (or a real temp directory), NOT a mock AgenticFileSystem
- Verify: test creates a temp directory (e.g., `os.tmpdir()`) and cleans up in afterAll

### DBB-m29-int-003: Integration tests cover core commands
- Requirement: T3
- Given: integration test file exists
- When: running integration tests
- Expect: tests exercise at least: ls, cat, grep, mkdir, rm, cp, mv against real filesystem
- Verify: test file contains describe/it blocks for each command

### DBB-m29-int-004: Integration tests all pass
- Requirement: T3
- Given: integration test file exists
- When: `vitest run test/*node*integration*`
- Expect: all tests pass, 0 failures
- Verify: real filesystem behavior matches expected UNIX semantics

### DBB-m29-int-005: Integration tests clean up after themselves
- Requirement: T3
- Given: integration tests create temp directories
- When: tests complete (afterAll)
- Expect: temp directories are removed
- Verify: no leftover temp directories after test run

### DBB-m29-int-006: Integration tests use AgenticFileSystem interface
- Requirement: T3
- Given: integration test file exists
- When: inspecting test code
- Expect: real Node.js fs is wrapped in the AgenticFileSystem interface before being passed to shell
- Verify: tests validate cross-environment contract, not just raw Node.js fs behavior

### DBB-m29-int-007: Integration tests exercise error paths
- Requirement: T3
- Given: integration test file exists
- When: running tests
- Expect: at least one test verifies error behavior (e.g., cat non-existent file, rm non-existent file) against real filesystem
- Verify: error format matches UNIX convention `<cmd>: <path>: <reason>`

### DBB-m29-int-008: Integration tests verify exit codes
- Requirement: T3
- Given: integration test file exists
- When: running tests
- Expect: tests verify exit code 0 on success and non-zero on failure for at least 2 commands
- Verify: exit code behavior is validated against real filesystem

---

## D. Vision Gap Score (T4)

### DBB-m29-vision-001: Vision match score ≥ 90%
- Requirement: T4 — Re-run vision gap analysis
- Given: T1, T2, T3 all completed
- When: reading `.team/gaps/vision.json`
- Expect: `match` field ≥ 90
- Verify: score has improved from 70 to ≥90

### DBB-m29-vision-002: No major severity gaps remain
- Requirement: T4
- Given: T1, T2, T3 all completed
- When: reading `.team/gaps/vision.json`
- Expect: no gap entry with `severity: "major"` and `status: "partial"`
- Verify: all major gaps are resolved or marked implemented

### DBB-m29-vision-003: PRD match score maintained ≥ 90%
- Requirement: T4
- Given: T1, T2, T3 all completed
- When: reading `.team/gaps/prd.json`
- Expect: `match` field ≥ 90 (currently 91, must not regress)
- Verify: no new PRD gaps introduced by changes

### DBB-m29-vision-004: DBB match score maintained ≥ 85%
- Requirement: T4
- Given: T1, T2, T3 all completed
- When: reading `.team/gaps/dbb.json`
- Expect: `match` field ≥ 85 (currently 88, must not regress)
- Verify: grep exit code DBB items (DBB-grep-002, DBB-grep-008) now pass

---

## E. Overall Acceptance

### DBB-m29-accept-001: All existing tests still pass
- Requirement: All tasks
- Given: T1, T2, T3 completed
- When: `vitest run`
- Expect: no new test failures introduced (all tests pass or are expected to fail only known exceptions)
- Verify: no regressions from architecture changes or grep fix

### DBB-m29-accept-002: Overall test count does not decrease
- Requirement: All tasks
- Given: T1, T2, T3 completed
- When: `vitest run --reporter=verbose`
- Expect: total test count ≥ current count (integration tests add new tests)
- Verify: test coverage maintained or improved
