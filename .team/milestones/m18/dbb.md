# m18 Done-By-Definition (DBB)

## DBB-001: All tests pass (0 failures)
- `npm test` completes with exit code 0
- Total test count ≥ 483 (no tests removed to make them pass)
- `test/backends/agentic-store-stat.test.ts` passes (the 1 previously failing test)
- No test skips or `.todo` markers added to suppress failures

## DBB-002: agentic-store-stat.test.ts import path fixed
- Test file imports `AgenticStoreBackend` from a path Node.js can resolve at runtime
- Import follows the same pattern used by other test files in `test/backends/`
- All 5 test cases in the file pass: existing file stat, missing file null, isDirectory false, unicode size, empty string size

## DBB-003: All backend classes have JSDoc on public methods
- `AgenticStoreBackend`: JSDoc on `get`, `set`, `delete`, `list`, `scan`, `scanStream`, `batchGet`, `batchSet`, `stat`
- `OPFSBackend`: JSDoc on same 9 methods
- `NodeFsBackend`: JSDoc on same 9 methods
- `MemoryStorage`: JSDoc on `get`, `set`, `delete`, `list`, `scan`, `scanStream`, `batchGet`, `batchSet` (no `stat`)
- `LocalStorageBackend`: JSDoc on same 8 methods (no `stat`)
- `SQLiteBackend`: JSDoc on all 9 methods
- JSDoc style matches existing patterns on `AgenticFileSystem` methods: short prose description, `@param` with type info, `@returns` where applicable

## DBB-004: AgenticFileSystem exposes batchGet, batchSet, scanStream
- `AgenticFileSystem.batchGet(paths: string[]): Promise<Record<string, string | null>>` — delegates to `this.storage.batchGet()`
- `AgenticFileSystem.batchSet(entries: Record<string, string>): Promise<void>` — delegates to `this.storage.batchSet()`
- `AgenticFileSystem.scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }>` — delegates to `this.storage.scanStream()`
- All three methods have JSDoc documentation
- `batchGet` and `batchSet` respect permissions (read-only check for `batchSet`)

## DBB-005: Agent tool definitions updated
- `getToolDefinitions()` includes 3 new tool schemas: `batch_get`, `batch_set`, `grep_stream`
- `executeTool()` handles `batch_get`, `batch_set`, `grep_stream` dispatching to the new methods
- Tool parameter schemas match the method signatures (paths array, entries object, pattern string)
- Existing 6 tool definitions remain unchanged and functional

## DBB-006: PRD and Vision match ≥ 90%
- PRD match score ≥ 90% (no remaining gaps for JSDoc or public API completeness)
- Vision match score ≥ 90% (batch operations and streaming exposed as first-class API)
