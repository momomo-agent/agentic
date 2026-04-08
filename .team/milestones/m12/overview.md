# M12: stat() Completeness, Agent Tool Parity & Auto Backend Selection

## Goals
- Implement `stat()` on `AgenticStoreBackend` and `OPFSBackend`
- Add `delete` and `tree` agent tool definitions
- Implement automatic backend selection based on runtime environment

## Acceptance Criteria
- `AgenticStoreBackend.stat()` returns `{ size, mtime }` or `null` for missing files
- `OPFSBackend.stat()` returns `{ size, mtime }` or `null` for missing files
- `getToolDefinitions()` includes `file_delete` and `file_tree` tools
- `executeTool()` handles `file_delete` and `file_tree` operations
- `createDefaultBackend()` (or equivalent) auto-selects backend: OPFS in browser, NodeFs in Node.js, Memory as fallback

## Scope
Vision match gaps: AgenticStoreBackend.stat(), OPFSBackend.stat(), agent tool parity, auto backend selection
