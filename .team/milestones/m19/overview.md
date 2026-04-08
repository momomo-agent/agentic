# Milestone m19: PRD Gap Closure — Streaming, Error Consistency, OPFS Hardening & stat() Parity

**Goal:** Close remaining PRD and architecture gaps to push PRD match from 72% → 90%+ and architecture match from 82% → 90%+.

**Scope:** 6 tasks targeting the highest-impact gaps across streaming, error handling, stat() metadata, OPFS hardening, and test coverage.

**Dependencies:** m18 completed. All m19 tasks can be worked in parallel.

## Tasks

| # | Task | Priority | Assignee | Target |
|---|------|----------|----------|--------|
| 1 | Add `permissions` field to stat() result across all backends | P1 | tester-2 (done) | PRD §2 |
| 2 | Fix AgenticStoreBackend scan() to stream instead of loading full content | P1 | developer | PRD §1 |
| 3 | Verify cross-backend consistency test coverage completeness | P1 | developer | PRD §4 |
| 4 | Standardize error handling across backends — typed throws vs silent swallow | P1 | developer | PRD §3 |
| 5 | Fix OPFSBackend consistency: stat() directory support, delete() error handling, empty-path validation | P1 | developer | Architecture gaps |
| 6 | Fix AgenticStoreBackend stat() mtime to use stored timestamp instead of Date.now() | P1 | developer | Vision gap |

## Acceptance Criteria

- [ ] stat() returns { size, mtime, isDirectory, permissions } on all backends
- [ ] AgenticStoreBackend scan()/scanStream() uses true streaming, not full-content loading
- [ ] OPFSBackend.stat() correctly detects directories
- [ ] OPFSBackend.delete() silently no-ops on missing paths (like other backends)
- [ ] OPFSBackend validates empty paths
- [ ] AgenticStoreBackend.stat() returns stored mtime, not Date.now()
- [ ] All backends throw typed errors (NotFoundError, PermissionDeniedError, IOError) consistently
- [ ] Cross-backend test suite covers all 6 backends for get/set/delete/list/scan/stat/batchGet/batchSet
- [ ] No regressions in existing 524+ passing tests
- [ ] PRD gap analysis re-run shows ≥90% match
