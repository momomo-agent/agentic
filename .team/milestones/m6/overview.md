# M6: Quality Polish & Release Readiness

## Goals
- Fix the 1 remaining failing test (timing-dependent race condition)
- Create CHANGELOG.md (required by M4 DBB)
- Implement stat() on OPFSBackend and AgenticStoreBackend (vision gap)
- Add delete and tree agent tools (vision gap)

## Tasks
- Fix NodeFsBackend race condition test (P1)
- Create CHANGELOG.md with release history (P1)
- Implement stat() on OPFSBackend and AgenticStoreBackend (P0)
- Add file_delete and file_tree agent tool definitions (P1)

## Acceptance Criteria
- All tests pass (0 failures)
- CHANGELOG.md exists with entries for m1–m5 features
- stat() returns {size, mtime} or null on all backends
- Agent tools include delete and tree operations
