# m16 — PRD Compliance: grep -i, wc -l, touch fix, coverage gate

## Goals
- Fix grep -i in non-streaming/non-pipe path (PRD partial)
- Implement wc -l flag (PRD/DBB missing)
- Fix touch on existing empty file (PRD partial)
- Enforce coverage gate: ≥80% statement / ≥75% branch (PRD missing)

## Acceptance Criteria
- grep -i works for all call paths (streaming, pipe, direct)
- wc -l returns line count only
- touch on existing empty file preserves content (no overwrite)
- vitest coverage thresholds enforced and reported

## Scope
4 tasks, all independent.
