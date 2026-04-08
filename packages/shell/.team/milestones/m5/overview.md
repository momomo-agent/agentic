# M5: Test Hardening & DBB Compliance

## Goals
- Fix 4 failing tests (including DBB-017 resolve() update)
- Cover edge cases: rm multi-path, rm -r deep nesting, grep -i invalid regex, 3+ stage pipes
- Create EXPECTED_DBB.md with formal Done-By-Definition criteria

## Acceptance Criteria
- All 148+ tests pass (0 failures)
- EXPECTED_DBB.md exists and covers all commands
- Edge cases documented and tested

## Scope
Targets dbb.json gap: EXPECTED_DBB.md missing, and test-coverage.json failing tests.
