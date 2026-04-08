# m21 Done-By-Definition (DBB)

## DBB-001: JSDoc on all backend classes
- All 6 backend classes have method-level JSDoc on public methods (already complete — verified by inspection)
- `test/jsdoc.test.js` includes test cases that verify JSDoc `/**` blocks exist before each public method on all 6 backend classes: `AgenticStoreBackend`, `OPFSBackend`, `NodeFsBackend`, `MemoryStorage`, `SQLiteBackend`, `LocalStorageBackend`
- Methods verified per backend: `get`, `set`, `delete`, `list`, `scan`, `scanStream`, `batchGet`, `batchSet`, `stat` (where implemented)
- Test reads each backend source file and asserts `/**` appears before each method declaration
- 5 of 6 backend classes lack class-level JSDoc (only `SQLiteBackend` has it) — add class-level `/** */` with `@example` to: `AgenticStoreBackend`, `OPFSBackend`, `NodeFsBackend`, `MemoryStorage`, `LocalStorageBackend`
- Each class-level JSDoc includes a one-line summary and `@example` showing `new AgenticFileSystem({ storage: new XxxBackend(...) })`

## DBB-002: SQLiteBackend in createBackend() auto-selection
- `createBackend()` in `src/index.ts` includes SQLiteBackend in the auto-selection chain
- Detection logic: attempt to dynamically import `better-sqlite3` (Node.js) or check for a passed `sqliteDb` option
- Fallback order is: explicit `sqliteDb` option → Node.js with `better-sqlite3` → Node.js `NodeFsBackend` → browser OPFS → browser IndexedDB → Memory
- When `better-sqlite3` is available and no explicit `sqliteDb` is provided, `createBackend()` creates a SQLite file at a configurable path (default: `~/.agentic-fs/data.db`)
- `createBackend()` docs updated to reflect the new option and detection order
- `test/create-backend-sqlite.test.js` (existing) passes, confirming SQLite auto-selection works

## DBB-003: batchGet/batchSet/scanStream exposed as agent tool definitions
- `AgenticFileSystem.getToolDefinitions()` includes `batch_get`, `batch_set`, and `grep_stream` tool definitions (verify these already exist — they may already be present)
- `AgenticFileSystem.executeTool()` handles `batch_get`, `batch_set`, and `grep_stream` cases (verify these already exist)
- If tool definitions already exist, this task is verification-only
- If any agent tool definition or executeTool handler is missing, add it
- Test in `test/agent-tools-dbb.test.js` or equivalent verifies all three tools are callable via `executeTool()`

## DBB-004: Per-backend test coverage verification
- Each of the 6 backends (`AgenticStoreBackend`, `OPFSBackend`, `NodeFsBackend`, `MemoryStorage`, `LocalStorageBackend`, `SQLiteBackend`) has dedicated test coverage for: `get`, `set`, `delete`, `list`, `scan`, `stat`
- `batchGet`, `batchSet`, `scanStream` covered where applicable
- Test matrix documented: backend × method → test file reference
- Missing test files created in `test/backends/` directory
- All tests pass with `node --test`
- `test/cross-backend.test.js` covers all Node.js-testable backends (5 of 6, excluding OPFS)
