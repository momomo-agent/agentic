# M2: Public API Completeness & Developer Experience

## Goals
Expose missing public APIs, add JSDoc documentation, and implement file metadata support.

## Scope
- Export ShellFS in index.ts so shell interface is available to users
- Add JSDoc to all public methods in AgenticFileSystem and StorageBackend interface
- Populate file metadata (size, mtime) in LsResult across all backends
- Add MemoryStorage backend for quick-start / testing without persistence

## Acceptance Criteria
- `ShellFS` is exported from index.ts and usable by consumers
- All public methods on `AgenticFileSystem` and `StorageBackend` have JSDoc comments
- `ls()` returns `size` field populated on NodeFsBackend (and where available on others)
- `MemoryStorage` backend passes the same get/set/delete/list/scan tests as other backends

## Tasks
- task-1775532372624: Export ShellFS in index.ts (P1)
- task-1775532383398: Add JSDoc to public APIs (P1)
- task-1775532383428: Populate file metadata in LsResult (P1)
- task-1775532383458: Implement MemoryStorage backend (P1, blocked by task-1775531289579)
