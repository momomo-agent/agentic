# M8 Technical Design — Build Fix & Production Readiness

## Key Finding After Code Review

Most features are already implemented:
- `createBackend()` auto-selection: already in `src/index.ts` (Node → OPFS → IndexedDB → Memory)
- `OPFSBackend.stat()`: already implemented
- `AgenticStoreBackend.stat()`: already implemented  
- `file_delete` + `file_tree` tools: already in `getToolDefinitions()` and `executeTool()`

## Actual Work Required

### Only real bug: DTS build error in `src/index.ts:40`
`new AgenticStoreBackend()` called with 0 args, but constructor requires `store: AgenticStore`.

**Fix**: Make `store` parameter optional in `AgenticStoreBackend` constructor with a default IndexedDB implementation.

## File to Modify

- `src/backends/agentic-store.ts` — make `store` optional, default to built-in IndexedDB wrapper
