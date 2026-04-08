# Add SQLiteBackend to createBackend() auto-selection

## Progress

### Implementation Summary

Modified `src/index.ts` to integrate SQLiteBackend into the `createBackend()` auto-selection chain.

### Changes Made

1. **Extended options type** — Added `sqlitePath?: string` to the `createBackend()` options parameter
2. **Added SQLite auto-detection** — In the Node.js branch, before falling back to `NodeFsBackend`, the function now tries to dynamically import `better-sqlite3` and create a `SQLiteBackend`. If the import fails (module not installed), it falls through to `NodeFsBackend`.
3. **Updated JSDoc** — Added documentation showing the new 6-step detection order
4. **Added `@ts-expect-error`** — Needed for the `better-sqlite3` dynamic import since it's an optional peer dependency with no type declarations

### Detection Order (Updated)

1. Explicit `sqliteDb` option → SQLiteBackend
2. Node.js with `better-sqlite3` installed → SQLiteBackend (auto-created DB at `sqlitePath` or `.agentic-fs.db`)
3. Node.js without `better-sqlite3` → NodeFsBackend
4. Browser with OPFS → OPFSBackend
5. Browser with IndexedDB → AgenticStoreBackend (IDB)
6. Fallback → MemoryStorage

### Test Results

- `test/create-backend-sqlite.test.js` — 8/8 passed
- `test/create-backend.test.js` — 5/5 passed
- Build (`npx tsup`) — ESM + DTS both succeed

### Notes

- `better-sqlite3` is not installed in this environment, so the auto-detection gracefully falls through to NodeFsBackend (existing behavior preserved)
- No changes needed to SQLiteBackend class itself
- The `@ts-expect-error` comment is needed because `better-sqlite3` has no type declarations and is an optional dependency
