# m21 Technical Design — JSDoc Completeness, SQLite Auto-Selection & Public API Exposure

## Overview

Four tasks targeting PRD and Vision gaps: JSDoc test coverage formalization, SQLiteBackend integration into the auto-selection chain, agent tool definition completeness verification, and per-backend test coverage audit.

## 1. JSDoc Completeness Gate (task-1775589122325)

**Problem:** PRD §5 requires JSDoc on all backend classes. The existing `test/jsdoc.test.js` only validates JSDoc on `AgenticFileSystem` methods and `StorageBackend` interface methods — not on the 6 concrete backend classes.

**Key Finding:** All 6 backend classes already have method-level JSDoc on their public methods (verified by inspection). However, 5 of 6 lack class-level JSDoc — only `SQLiteBackend` has a class-level `/** */` comment with `@example`.

**Approach:**
- Add class-level JSDoc with `@example` to 5 backends: `AgenticStoreBackend`, `OPFSBackend`, `NodeFsBackend`, `MemoryStorage`, `LocalStorageBackend`
- Pattern: `/** One-line summary. @example const fs = new AgenticFileSystem({ storage: new XxxBackend() }) */`
- Extend `test/jsdoc.test.js` to read each backend source file and assert `/**` exists before each public method
- Backend files to check: `src/backends/agentic-store.ts`, `src/backends/opfs.ts`, `src/backends/node-fs.ts`, `src/backends/memory.ts`, `src/backends/sqlite.ts`, `src/backends/local-storage.ts`
- Methods to verify per backend: `get`, `set`, `delete`, `list`, `scan`, `scanStream`, `batchGet`, `batchSet`, `stat`
- Use the same pattern as the existing test: find method index, check preceding 200 chars for `/**`

**Files:** `test/jsdoc.test.js`, `src/backends/agentic-store.ts`, `src/backends/opfs.ts`, `src/backends/node-fs.ts`, `src/backends/memory.ts`, `src/backends/local-storage.ts`

## 2. SQLiteBackend in createBackend() Auto-Selection (task-1775589123427)

**Problem:** Vision gap — `createBackend()` chain is Node → OPFS → IndexedDB → Memory. SQLiteBackend is excluded despite being a valid persistent backend.

**Current `createBackend()` in `src/index.ts`:**
```ts
if (options?.sqliteDb) → SQLiteBackend  (already exists)
if (process.versions.node) → NodeFsBackend
if (navigator.storage) → OPFSBackend
if (indexedDB) → AgenticStoreBackend (IDB)
fallback → MemoryStorage
```

**Approach:**
- Add a new detection step: if running in Node.js and `better-sqlite3` is available, create a SQLiteBackend with a default database file
- Insert detection BEFORE the `NodeFsBackend` fallback in the Node.js branch
- Detection: `try { await import('better-sqlite3') } catch { /* not available, skip */ }`
- Default DB path: `options?.sqlitePath ?? join(process.cwd(), '.agentic-fs.db')`
- Updated fallback order for Node.js: explicit `sqliteDb` → auto `better-sqlite3` → `NodeFsBackend`
- For browsers, order unchanged: OPFS → IndexedDB → Memory
- Update JSDoc on `createBackend()` to document the new detection order
- Add `sqlitePath?: string` to the options type (inline or in `FileSystemConfig`)

**Files:** `src/index.ts`

## 3. Agent Tool Definition Completeness (task-1775589127175)

**Problem:** Vision gap — `batchGet`, `batchSet`, `scanStream` should be exposed as agent tools.

**Key Finding:** `AgenticFileSystem.getToolDefinitions()` already includes `batch_get`, `batch_set`, and `grep_stream` tool definitions. `executeTool()` already handles all three cases. The public methods `batchGet()`, `batchSet()`, `scanStream()` are already on the `AgenticFileSystem` class with JSDoc. This task is verification-only.

**Approach:**
- Verify `batch_get`, `batch_set`, `grep_stream` appear in `getToolDefinitions()` output
- Verify `executeTool('batch_get', ...)`, `executeTool('batch_set', ...)`, `executeTool('grep_stream', ...)` work correctly
- Add or extend tests in `test/agent-tools-dbb.test.js` (or `test/m18-batch-api.test.js`) to assert these three tools are present and callable
- No source code changes needed if verification passes

**Files:** `test/agent-tools-dbb.test.js` or `test/m18-batch-api.test.js` (test only)

## 4. Per-Backend Test Coverage Verification (task-1775589127602)

**Problem:** PRD §4 requires complete per-backend test suites. Need to audit and fill gaps.

**Current state:**
- `test/cross-backend.test.js` covers 5 backends for get/set/delete/list/scan/batchGet/batchSet/stat
- Individual backend test files exist for some backends: `test/sqlite-backend.test.js`, `test/memory-storage.test.js`, `test/local-storage-backend.test.js`
- OPFS is browser-only (excluded from Node.js test suite — correct)
- Need to verify no backend is missing from the cross-backend test matrix

**Approach:**
- Audit `test/cross-backend.test.js` to confirm all 5 Node.js-testable backends are included: `NodeFsBackend`, `AgenticStoreBackend`, `MemoryStorage`, `LocalStorageBackend`, `SQLiteBackend`
- Verify each method (get, set, delete, list, scan, batchGet, batchSet, stat) has at least one test per backend
- Create missing per-backend test files in `test/backends/` if a backend lacks dedicated tests
- Document the test matrix as a comment in the cross-backend test file

**Files:** `test/cross-backend.test.js`, potentially new files in `test/backends/`
