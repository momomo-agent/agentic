# M4: Streaming, SQLite & Test Coverage

## Goals
Add scan() streaming for large files, SQLite backend adapter, symlink support, and test coverage for all m3 additions.

## Scope
- Implement streaming scan() to avoid loading large files into memory
- Add SQLite backend adapter (vision roadmap item)
- Add symlink support to NodeFsBackend
- Tests for localStorage, EmbedBackend, tree(), and permissions system

## Acceptance Criteria
- scan() streams results via AsyncIterable or callback, not full array load
- SQLite backend passes same interface tests as other backends
- Symlinks resolved correctly in NodeFsBackend list/get/scan
- All m3 features have test coverage (localStorage, EmbedBackend, tree, permissions)

## Tasks
- Implement streaming scan() (P0, missing)
- Add SQLite backend adapter (P1, missing)
- Add symlink support in NodeFsBackend (P1, missing)
- Tests for m3 backends and features (P0, missing)
- Final documentation pass (P1, partial)
