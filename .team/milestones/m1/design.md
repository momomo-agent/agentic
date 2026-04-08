# M1 Technical Design — API Consistency & Test Foundation

## Overview

Fix three categories of bugs across all backends, then add tests and docs.

## Execution Order

1. Fix `scan()` return type (task-1775531683476) — unblocks test suite
2. Fix typed errors (task-1775531687208) — new `src/errors.ts`
3. Fix `list()` path prefix (task-1775531289546) — one-liner per backend
4. Fix OPFS walkDir error handling (task-1775531865819)
5. Add test suite (task-1775531289579) — after scan() fixed
6. Update README (task-1775531289613)

## Key Architectural Decisions

### Typed Errors (`src/errors.ts`)
Three classes exported from a new file, imported by all backends and `filesystem.ts`:
- `NotFoundError extends Error`
- `PermissionDeniedError extends Error`
- `IOError extends Error`

`StorageBackend` interface in `types.ts` must update `scan()` return type to include `line`:
```ts
scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>>
```

### Path Normalization
All `list()` implementations must return paths with a leading `/`. NodeFsBackend already does this. AgenticStoreBackend and OPFSBackend need normalization.

### Test Strategy
Use Vitest. NodeFsBackend tests run in Node. OPFSBackend tests use a mock. AgenticStoreBackend tests use an in-memory Map store. A shared `backendContract` test suite runs against all three.

## Files Touched

| File | Change |
|------|--------|
| `src/errors.ts` | New — typed error classes |
| `src/types.ts` | Update `scan()` return type, export error types |
| `src/backends/agentic-store.ts` | Fix `scan()` + `list()` path prefix |
| `src/backends/opfs.ts` | Fix `walkDir` error handling |
| `src/backends/node-fs.ts` | No changes needed |
| `src/filesystem.ts` | Use typed errors instead of string errors |
| `src/tests/backend.contract.ts` | New — shared contract test suite |
| `src/tests/agentic-store.test.ts` | New |
| `src/tests/node-fs.test.ts` | New |
| `src/tests/opfs.test.ts` | New |
| `README.md` | Add backend examples + perf table |
