# Design: Final Documentation Pass

## Files to Modify
- `src/types.ts` — JSDoc on all interface members
- `src/filesystem.ts` — JSDoc on all public methods
- `src/backends/sqlite.ts` — JSDoc on class and constructor
- `src/index.ts` — ensure all exports are documented
- `README.md` — add SQLite example, streaming scan example, symlink docs, performance table

## JSDoc Requirements

### StorageBackend interface (src/types.ts)
Each method already has a one-line comment. Expand to include:
- `@param` for each parameter
- `@returns` describing return value and null conditions
- `@throws` for methods that can throw

### AgenticFileSystem (src/filesystem.ts)
Each public method needs:
- Description sentence
- `@param` tags
- `@returns` tag
- `@example` for non-obvious methods (grep, tree, semantic search)

### SQLiteBackend (src/backends/sqlite.ts)
- Class-level JSDoc: purpose, supported environments, required peer deps
- Constructor: document `db` parameter and accepted types

## README Additions

### New sections to add after existing backend docs:
1. **SQLite Backend** — constructor usage, Node.js example with `better-sqlite3`, browser example with `sql.js`
2. **Streaming scan()** — `scanStream()` usage example with `for await`
3. **Symlink behavior** — note that NodeFsBackend follows symlinks, circular symlinks are skipped

### Performance table update
Add SQLiteBackend row with relative benchmarks for get/set/list/scan vs MemoryStorage/NodeFsBackend.

### CHANGELOG.md
Add M4 section at top:
- Streaming `scanStream()` on all backends
- SQLiteBackend adapter
- NodeFsBackend symlink support
- M3 test coverage

## Notes
- Do not add JSDoc to private methods or internal helpers
- Keep examples minimal (3-5 lines each)
- Performance numbers should be relative (e.g. "~2x slower than MemoryStorage") not absolute
