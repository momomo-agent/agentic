# M1 DBB - API Consistency & Test Foundation

## DBB-001: scan() returns line number on all backends
- Requirement: Fix scan() return type inconsistency
- Given: Any backend calls `scan(pattern)` with a matching file
- Expect: Each result has `{ path: string, line: number, content: string }`
- Verify: `line` field is a positive integer present in every result object

## DBB-002: scan() no line field missing
- Requirement: Fix scan() return type inconsistency
- Given: AgenticStoreBackend calls `scan(pattern)`
- Expect: Results include `line` field (not just `{path, content}`)
- Verify: `result[0].line !== undefined`

## DBB-003: list() paths have leading slash — AgenticStoreBackend
- Requirement: Unify list() path format
- Given: Files written at paths like `foo/bar.txt`, then `list()` called
- Expect: Returned paths start with `/` (e.g. `/foo/bar.txt`)
- Verify: Every path in result matches `/^\/`

## DBB-004: list() paths have leading slash — OPFSBackend
- Requirement: Unify list() path format
- Given: Same as DBB-003 on OPFSBackend
- Expect: Same as DBB-003
- Verify: Same as DBB-003

## DBB-005: list() paths have leading slash — NodeFsBackend
- Requirement: Unify list() path format
- Given: Same as DBB-003 on NodeFsBackend
- Expect: Same as DBB-003
- Verify: Same as DBB-003

## DBB-006: NotFound error thrown on missing file read
- Requirement: Implement typed error classes
- Given: `read("/nonexistent.txt")` called on any backend
- Expect: Throws or returns an error that is an instance of `NotFoundError` (not a plain string)
- Verify: `err instanceof NotFoundError` is true

## DBB-007: PermissionDenied error thrown on read-only write
- Requirement: Implement typed error classes
- Given: Filesystem initialized with `readOnly: true`, then `write()` called
- Expect: Throws or returns `PermissionDeniedError` instance
- Verify: `err instanceof PermissionDeniedError` is true

## DBB-008: IOError thrown on backend I/O failure
- Requirement: Implement typed error classes
- Given: Backend encounters an unexpected I/O failure (e.g. corrupted store)
- Expect: Throws `IOError` instance, not a generic string
- Verify: `err instanceof IOError` is true

## DBB-009: OPFS walkDir errors are logged, not silently swallowed
- Requirement: Fix OPFS walkDir error handling
- Given: OPFSBackend `list()` encounters an inaccessible subdirectory
- Expect: Error is logged (console.error or equivalent) AND propagated or collected
- Verify: No silent empty result; error is observable to the caller or in logs

## DBB-010: Per-backend test suite covers core operations
- Requirement: Add complete test suite
- Given: Test suite runs for each backend (AgenticStore, OPFS, NodeFs)
- Expect: Tests for `get`, `set`, `delete`, `list`, `scan` all pass
- Verify: `npm test` exits 0 with passing tests for all three backends

## DBB-011: Cross-backend consistency — same operations, same results
- Requirement: Add complete test suite (cross-backend consistency)
- Given: Same sequence of write/read/list/scan operations run on each backend
- Expect: Results are structurally identical across all backends
- Verify: Shared test suite passes against all three backends without modification

## DBB-012: Edge case — empty path rejected
- Requirement: Add complete test suite (edge cases)
- Given: `write("")` or `read("")` called
- Expect: Error returned/thrown (not silent success)
- Verify: Result is an error, not a successful operation

## DBB-013: Edge case — path with special characters
- Requirement: Add complete test suite (edge cases)
- Given: File written at path `/foo bar/baz~qux.txt`
- Expect: File can be read back at the same path
- Verify: `read("/foo bar/baz~qux.txt")` returns the written content

## DBB-014: README includes backend configuration examples
- Requirement: README examples and performance comparison
- Given: README.md is read
- Expect: Contains code examples showing how to instantiate each of the 3 backends
- Verify: AgenticStoreBackend, OPFSBackend, NodeFsBackend each have a usage snippet

## DBB-015: README includes performance comparison table
- Requirement: README examples and performance comparison
- Given: README.md is read
- Expect: Contains a table comparing IndexedDB, OPFS, and Node fs performance characteristics
- Verify: Table has at least 3 rows (one per backend) with measurable metrics
