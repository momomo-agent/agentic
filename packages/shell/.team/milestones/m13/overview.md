# Milestone 13 — PRD Compliance & Test Coverage Gates

## Goals
Close remaining PRD gaps: fix grep -i, wc -l flag, touch empty file bug, and verify test coverage gates.

## Scope

### 1. Fix grep -i case-insensitive (P0)
`grep -i` works in pipe/streaming paths but not in main `fs.grep()` path.

**Acceptance criteria:**
- `grep -i pattern file` matches case-insensitively in all paths
- Combined with `-l` and `-c` flags works correctly

### 2. Fix wc -l flag (P1)
`wc` always returns full output; `-l` flag not handled.

**Acceptance criteria:**
- `wc -l file` returns only line count
- `wc -w file` returns only word count
- `wc -c file` returns only char count

### 3. Fix touch on empty file (P1)
`touch` checks `!r.content` which is falsy for empty string — may overwrite empty files.

**Acceptance criteria:**
- `touch existingEmptyFile` updates mtime without overwriting content
- `touch newFile` creates file with empty content

### 4. Test coverage gates (P1)
Coverage not measured; PRD requires ≥80% statement / ≥75% branch, 148+ tests.

**Acceptance criteria:**
- Coverage report generated and thresholds verified
- Test count ≥ 148 confirmed

## Out of Scope
- Environment variables (`$VAR`)
- Command substitution (`$(cmd)`)
- Background jobs (`&`)
