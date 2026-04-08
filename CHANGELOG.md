# Changelog

## [Unreleased]

## [0.5.0] - M5: Metadata Completeness, Agent Tools & Test Coverage
### Added
- File metadata: stat() returns size/mtime for NodeFsBackend and OPFSBackend
- ls() and tree() populate size/mtime from stat()
- AgenticStoreBackend path normalization (all paths prefixed with '/')
- Concurrent operation tests for all backends
- Edge case tests (empty paths, special characters)

## [0.4.0] - M4: Streaming, SQLite & Test Coverage
### Added
- Streaming scan via scanStream() returning AsyncIterable
- SQLite backend (SqliteBackend)
- Symlink support in NodeFsBackend
- scan() return type unified to ScanResult[]

## [0.3.0] - M3: Storage Backends & Agent Tooling
### Added
- LocalStorageBackend for browser environments
- MemoryStorage backend
- Shell tools for agent use (grep, ls, tree, read, write, delete)
- createBackend() factory function

## [0.2.0] - M2: Public API Completeness & Developer Experience
### Added
- batchGet() and batchSet() operations
- tree() API for directory tree traversal
- JSDoc on all public APIs
- list() path format consistency across backends

## [0.1.0] - M1: API Consistency & Test Foundation
### Added
- NodeFsBackend, AgenticStoreBackend, OPFSBackend
- Core operations: get/set/delete/list/scan
- Typed errors: NotFoundError, PermissionDeniedError, IOError
- Cross-backend consistency test suite
