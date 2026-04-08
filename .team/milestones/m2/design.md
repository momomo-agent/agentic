# M2 Technical Design — Public API Completeness & Developer Experience

## Execution Order

1. Export ShellFS (task-1775532372624) — one-liner, no deps
2. Add JSDoc (task-1775532383398) — comments only, no logic changes
3. File metadata in LsResult (task-1775532383428) — extends types + NodeFsBackend
4. MemoryStorage backend (task-1775532383458) — blocked by m1 test suite

## Files Touched

| File | Change |
|------|--------|
| `src/index.ts` | Add `ShellFS` export |
| `src/shell.ts` | No changes |
| `src/filesystem.ts` | Add JSDoc to all public methods |
| `src/types.ts` | Add `mtime?: number` to `LsResult`; JSDoc on `StorageBackend` |
| `src/backends/node-fs.ts` | Populate `size`/`mtime` in `list()` via `stat()` |
| `src/backends/memory.ts` | New — in-memory `StorageBackend` |
| `src/index.ts` | Export `MemoryStorage` |

## New Tasks (added to m2)

5. batchGet/batchSet (task-1775533551366) — extend interface + all backends
6. Cross-backend consistency tests (task-1775533564409) — `tests/cross-backend.test.js`
7. Edge case tests (task-1775533568331) — `tests/edge-cases.test.js`

| File | Change |
|------|--------|
| `src/types.ts` | Add `batchGet`/`batchSet` to `StorageBackend` |
| `src/backends/node-fs.ts` | Implement `batchGet`/`batchSet` |
| `src/backends/opfs.ts` | Implement `batchGet`/`batchSet` |
| `src/backends/agentic-store.ts` | Implement `batchGet`/`batchSet` |
| `tests/cross-backend.test.js` | New — shared contract tests for all backends |
| `tests/edge-cases.test.js` | New — edge case tests across backends |

## Key Decisions

### LsResult metadata
`LsResult` already has `size?: number`. Add `mtime?: number` (epoch ms). NodeFsBackend uses `fs.stat()` to populate both. Other backends return `undefined` for both — no crash, best-effort.

`filesystem.ts#ls()` must pass metadata through from backend. Backend `list()` only returns paths, so metadata must come from a separate `stat(path)` call or a new optional `StorageBackend` method.

Simplest approach: add optional `stat(path): Promise<{ size: number; mtime: number } | null>` to `StorageBackend`. NodeFsBackend implements it; others return `null`. `filesystem.ts#ls()` calls `stat()` when available.

### MemoryStorage
Plain `Map<string, string>`. `list()` returns keys with `/` prefix. `scan()` mirrors NodeFsBackend logic.
