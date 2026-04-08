# M5: Metadata Completeness, Agent Tools & Test Coverage

## Goals
- Complete stat() on all backends (OPFS, AgenticStore)
- Expand agent tools to include delete and tree operations
- Full edge-case test coverage across all 5 backends
- Fix AgenticStoreBackend scan/list normalization
- Polish README performance table

## Tasks

| ID | Title | Priority | Blocked By |
|----|-------|----------|------------|
| task-1775539909417 | Implement file metadata in LsResult | P0 | — |
| task-1775539915801 | Fix AgenticStoreBackend scan/list normalization | P1 | — |
| task-1775539920635 | Add concurrent and edge-case tests | P1 | task-1775538384470 |
| task-1775539920672 | Add performance comparison table to README | P1 | task-1775538384504 |
| task-1775558752316 | Implement stat() on OPFSBackend and AgenticStoreBackend | P0 | — |
| task-1775558760195 | Add delete and tree agent tool definitions | P1 | — |
| task-1775558760235 | Expand edge-case tests to all backends | P1 | task-1775538384470 |

## Acceptance Criteria
- stat() returns {size, mtime} on NodeFs, OPFS, AgenticStore; null for missing files
- Agent tools expose: cat, head, tail, find, delete, tree
- Edge-case tests pass on all 5 backends
- README performance table includes storage limits, browser support, recommended use cases
- All PRD §4 test coverage gaps resolved
