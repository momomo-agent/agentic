# m26 — PRD Bug Fixes & Performance Gates

## Goals
Fix remaining PRD compliance bugs (grep -i inconsistency, rm -r safety) and add performance benchmark gates. Target: push PRD match from ~88% (post-m25) toward ≥90%.

## Scope
1. **Fix grep -i multi-file/recursive inconsistency** — grep -i case-insensitive works in pipe/streaming paths but multi-file/recursive path passes empty string to fs.grep() and post-filters; inconsistent with -l/-c combinations (PRD gap: "partial")
2. **Fix rm -r deep nesting stack overflow** — rmRecursive uses recursion with no depth guard; convert to iterative approach or add depth guard for 10+ level trees (PRD gap: "partial")
3. **Add performance benchmarks** — automated perf tests: grep <500ms on 1MB file, find <1s on 1000 files, ls <100ms pagination (PRD gap: "no automated perf tests")
4. **Fix grep streaming for large files** — grepStream only triggered for single non-recursive file; ensure streaming grep works with -i/-l/-c flags and across file paths (PRD gap: "partial")

## Acceptance Criteria
- grep -i works consistently across single-file, multi-file, and recursive modes with -l/-c flags
- rm -r handles 20+ level deep directory trees without stack overflow
- Performance benchmark tests pass with stated thresholds
- All fixes have corresponding test cases
- PRD match score reaches ≥90%

## Progress
- **Done:** rm -r deep nesting safety (already uses iterative approach, test added)
- **Todo:** grep -i multi-file fix, performance benchmarks, grep streaming fix

## Blocked By
- m24 (test coverage) — recommended to complete first for stable baseline
- m25 (env vars, glob) — independent but recommended ordering
