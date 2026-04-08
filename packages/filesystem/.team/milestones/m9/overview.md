# M9: Test Coverage & Documentation Completeness

## Goals
- Fix SQLiteBackend empty path validation and tree tool name mismatch (P0)
- Add missing cross-backend and edge-case test suites (PRD/DBB gap)
- Complete README performance table and fix outdated scan() signature example

## Tasks
- task-1775569413579: Fix SQLiteBackend empty path validation and tree tool name (P0)
- task-1775567454494: Add cross-backend and edge-case test suites (blocked by above)
- task-1775567460417: Complete README performance table and docs

## Acceptance Criteria
- SQLiteBackend throws on empty string path (not normalizing to '/')
- Tree tool definition named 'file_tree' matching DBB spec
- tests/cross-backend.test.js covers all 6 backends with read/write/delete/list/scan
- tests/edge-cases.test.js covers empty paths, unicode, concurrent writes (10+), race conditions
- README perf table includes: large file read speed, storage limits, browser support matrix, recommended use cases
- README custom storage example uses current scan() signature with line number field
