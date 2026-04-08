# m17 Technical Design — Cross-Backend Consistency, OPFS Hardening & SQLite Auto-Selection

## Overview

Four focused tasks: a shared contract test suite, OPFS path validation hardening, OPFS delete resilience, and SQLite integration into the auto-selection chain.

## 1. Cross-Backend Consistency Test Suite (task-1775585021267)

**Problem:** Each backend has individual tests but no shared contract verifying behavioral equivalence.

**Approach:**
- Extend the existing `test/cross-backend.test.js` (which already tests 5 backends with `node:test`) with `batchGet`, `batchSet`, and additional `stat` assertions
- The existing test file uses a `for` loop over backend instances — add new test cases inside this loop for:
  - `batchGet` / `batchSet` consistency (not yet covered)
  - `stat()` returns correct shape or `null` (partially covered — extend with size/mtime checks)
  - `stat('')` empty-path validation throw test (new)

**Key decisions:**
- Reuse existing `test/cross-backend.test.js` rather than creating a new file — the infrastructure (5 backends, mock stores, `for` loop) is already there
- OPFSBackend excluded from Node.js test runner (browser-only); can be tested via Playwright later
- Existing tests already cover: get/set, delete, list, scan — no need to duplicate

## 2. OPFSBackend Empty-Path Validation (task-1775585021517)

**Problem:** `OPFSBackend.stat()` does not call `validatePath()`. The task description says all four methods need validation, but `get()`, `set()`, `delete()` already call `this.validatePath(path)` (lines 40, 51, 61 of `src/backends/opfs.ts`).

**Approach:**
- Verify `get()`, `set()`, `delete()` already validate (they do — lines 40, 51, 61)
- Add `this.validatePath(path)` call at the top of `stat()` (line 134, before the try block)
- Add test: `OPFSBackend.stat('')` throws `IOError`

## 3. OPFSBackend delete() Graceful Error Handling (task-1775585021564)

**Problem:** Task says delete() throws on missing path, but code at line 70 already catches `NotFoundError` and returns silently:
```ts
catch (e) {
  if (e instanceof DOMException && e.name === 'NotFoundError') return
  throw new IOError(String(e))
}
```

**Approach:**
- Verify current behavior is correct (it is — graceful handling already present)
- Add explicit test confirming `delete('/nonexistent')` does not throw
- If any edge case exists (e.g., parent directory missing → `getDirectoryHandle` throws NotFoundError), ensure it's caught by the same handler
- No code changes expected; test-only task

## 4. SQLiteBackend in createBackend() Auto-Selection (task-1775585021613)

**Problem:** `createBackend()` in `src/index.ts` selects NodeFs → OPFS → IndexedDB → Memory, but never SQLite.

**Approach:**
- In `createBackend()`, add a new option `sqliteDb?: unknown` to the `options` parameter
- Auto-selection chain in Node.js:
  1. If `options.sqliteDb` provided → return `new SQLiteBackend(options.sqliteDb)` immediately
  2. Otherwise, try `NodeFsBackend` (existing behavior)
  3. After NodeFs, try dynamic import of `better-sqlite3`: `try { const { default: Database } = await import('better-sqlite3'); return new SQLiteBackend(new Database(':memory:')) } catch {}`
  4. Fall through to OPFS/IndexedDB/Memory (existing browser chain)
- Update `createBackend` signature: `options?: { rootDir?: string; sqliteDb?: unknown }`
- Add test: `createBackend({ sqliteDb: mockDb })` returns `SQLiteBackend` instance

**Important:** The `better-sqlite3` auto-detect is opt-in via successful import. If the package isn't installed, it silently falls through to Memory. This avoids adding a hard dependency.
