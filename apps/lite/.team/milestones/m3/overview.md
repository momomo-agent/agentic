# Milestone 3: Code Sandbox & Quality Gates

## Goals
- Replace `new Function()` eval with a proper isolated sandbox in `code_exec`
- Ensure test coverage gaps are addressed

## Scope
- Integrate `quickjs-emscripten` or equivalent browser-compatible sandbox for `code_exec`
- Add test coverage for code execution tool

## Acceptance Criteria
- `code_exec` does not use `new Function()` / bare eval
- Sandbox runs in both Node and browser environments
- Existing tool tests pass

## Blocked By
- m2 must be completed (PRD.md and EXPECTED_DBB.md must be in place)
