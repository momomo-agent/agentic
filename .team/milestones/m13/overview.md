# M13: Test Coverage Completeness & README Polish

## Goals
- Expand concurrent write tests from 2 files to 10+ files
- Add race condition tests for same-file concurrent writes
- Add empty path edge-case tests
- Extend edge-case tests to OPFS, Memory, and LocalStorage backends
- Fix README performance table (add large file speed, storage limits, browser support, use cases)
- Fix README scan() example signature (add line number field)

## Acceptance Criteria
- Concurrent write tests cover 10+ simultaneous files
- Race condition tests are non-trivial (multiple writers, same file)
- Empty path tests present for all backends
- Edge-case tests cover all 5 backends (NodeFs, AgenticStore, OPFS, Memory, LocalStorage)
- README performance table has all required columns
- README scan() example matches current {path, line, content}[] return type

## Scope
Targets DBB gaps (partial/missing) and architecture gap in README.
No new features — test and documentation completeness only.
