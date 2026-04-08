# Milestone m21 — Shell Scripting Foundations

## Goals
Address the highest-priority vision gaps: environment variable substitution and command substitution. These are "missing" features that significantly limit shell scripting capabilities.

## Scope
- `$VAR` and `${VAR}` environment variable substitution in exec()
- `$(cmd)` command substitution (nested execution)
- Bracket glob expressions `[abc]`, `[a-z]` in expandGlob/matchGlob
- Cross-environment consistency test suite (DBB-env-001/002/003)

## Acceptance Criteria
- `exec("echo $HOME")` returns the value of HOME env var
- `exec("echo $(pwd)")` returns current directory
- `ls [abc]*.ts` matches files starting with a, b, or c
- Cross-env tests pass in browser/Electron/Node stubs
- All new code paths covered by tests

## Blocked By
m17, m18, m19, m20 tasks must reach `done` before this milestone activates.
