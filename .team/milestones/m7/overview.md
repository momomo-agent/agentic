# Milestone 7: Test Coverage Completeness & Runtime Auto-Selection

## Goals
- Expand edge-case test coverage to all backends (OPFS, Memory, LocalStorage)
- Increase concurrent write tests from 2 to 10+ files
- Add empty path tests
- Implement automatic backend selection based on runtime environment
- Fix README performance table missing columns and stale scan() signature example

## Acceptance Criteria
- Edge-case tests cover NodeFs, AgenticStore, OPFS, Memory, LocalStorage backends
- Concurrent write tests use 10+ files
- Empty path edge cases tested
- `createDefaultBackend()` or equivalent auto-selects backend (NodeFs in Node, OPFS in browser, Memory as fallback)
- README performance table includes: large file read speed, storage limits, browser support matrix, recommended use cases
- README custom storage example uses current scan() signature with line number field

## Scope
Targets remaining gaps in dbb.json (72% match) and vision.json (82% match).
