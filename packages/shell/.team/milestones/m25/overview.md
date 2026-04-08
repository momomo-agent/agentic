# m25 — PRD Feature Gaps: Env Vars, Glob & cp Fix

## Goals
Address the remaining PRD feature gaps to push PRD match from ~83% (post-m24) toward ≥90%. Focus on the highest-impact missing features: environment variable substitution and recursive glob patterns.

## Scope
1. **Environment variable substitution ($VAR)** — implement $VAR and ${VAR} expansion in command parsing with built-in vars (HOME, PWD) and user-defined vars via setVar/getVar API (PRD gap: "missing")
2. **Recursive glob + bracket expressions** — extend glob to support **/*.ts recursive patterns and [abc] bracket expressions (PRD gap: "partial")
3. **cp without -r error format** — fix directory copy error to match UNIX convention (PRD gap: "partial")

## Acceptance Criteria
- `echo $HOME` returns home directory value
- `**/*.ts` matches files across subdirectories
- `cp /dir /dest` (no -r) returns clear UNIX-standard error
- All new features have ≥3 test cases each
- PRD match score reaches ≥88%

## Blocked By
- m23 (test failure fixes) — ensures clean test baseline
- m24 (test coverage) — recommended to complete first for stable foundation
