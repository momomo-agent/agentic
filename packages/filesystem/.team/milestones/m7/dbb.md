# M7 DBB - Test Coverage Completeness & Runtime Auto-Selection

## DBB-001: Edge-case tests cover all 5 backends
- Requirement: Edge-case test coverage for OPFS, Memory, LocalStorage backends
- Given: Test suite runs
- Expect: Tests for NodeFs, AgenticStore, OPFS, Memory, LocalStorage all pass
- Verify: `npm test` exits 0 with passing edge-case tests for all five backends

## DBB-002: Concurrent write test uses 10+ files
- Requirement: Increase concurrent write tests from 2 to 10+ files
- Given: Concurrent write test runs
- Expect: At least 10 files are written concurrently without data loss or corruption
- Verify: All 10+ files are readable with correct content after concurrent writes complete

## DBB-003: Empty path rejected on all backends
- Requirement: Add empty path edge case tests
- Given: `write("", content)` or `read("")` called on any backend
- Expect: Error returned/thrown (not silent success or undefined behavior)
- Verify: Result is an error for all five backends

## DBB-004: createDefaultBackend() selects NodeFs in Node.js
- Requirement: Automatic backend selection based on runtime environment
- Given: `createDefaultBackend()` called in a Node.js environment
- Expect: Returns a NodeFsBackend instance
- Verify: Returned backend is NodeFsBackend (or equivalent Node.js backend)

## DBB-005: createDefaultBackend() selects OPFS in browser
- Requirement: Automatic backend selection based on runtime environment
- Given: `createDefaultBackend()` called in a browser environment where OPFS is available
- Expect: Returns an OPFSBackend instance
- Verify: Returned backend is OPFSBackend

## DBB-006: createDefaultBackend() falls back to Memory backend
- Requirement: Automatic backend selection — Memory as fallback
- Given: `createDefaultBackend()` called in an environment where neither NodeFs nor OPFS is available
- Expect: Returns a MemoryBackend instance (no error thrown)
- Verify: Returned backend is MemoryBackend and basic read/write operations succeed

## DBB-007: README performance table includes required columns
- Requirement: Fix README performance table missing columns
- Given: README.md is read
- Expect: Performance table includes columns for: large file read speed, storage limits, browser support, recommended use cases
- Verify: Table has all four columns with content for each backend row

## DBB-008: README scan() example uses current signature with line field
- Requirement: Fix stale scan() signature example in README
- Given: README.md custom storage example is read
- Expect: scan() example shows result objects with `line` field (e.g. `{ path, line, content }`)
- Verify: No example shows `{ path, content }` without `line` for scan() results
