# Milestone m20 — Test Quality & PRD Compliance Gaps

## Goals
Close remaining PRD partial/missing gaps focused on test coverage and correctness.

## Scope
1. Fix grep -i inconsistency with -l/-c in multi-file mode
2. Add path resolution unit tests (DBB-path-001 to DBB-path-005)
3. Add performance benchmarks (grep <500ms/1MB, find <1s/1000 files, ls <100ms)
4. Verify/enforce coverage gate (≥80% stmt, ≥75% branch, 148+ tests)

## Acceptance Criteria
- grep -i with -l and -c flags produces correct results in multi-file mode
- normalizePath/resolve edge cases covered by dedicated tests
- Performance benchmark suite exists and passes thresholds
- vitest coverage thresholds enforced and passing
