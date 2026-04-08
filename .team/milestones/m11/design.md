# M11 Technical Design — Test Coverage Completeness & Documentation Polish

## Overview
Close test coverage gaps and polish README documentation. No source code changes.

## Tasks

### 1. Per-backend test suites (task-1775571984308)
Create `test/backends/opfs.test.js`, `test/backends/memory.test.js`, `test/backends/local-storage.test.js`.
Each file tests: set/get, get missing→null, delete, delete missing→no-op, list, list with prefix, scan match, scan no match.
OPFS tests run only in browser environment (skip in Node via `process.env` check or test runner condition).

### 2. Concurrent write tests (task-1775571992017)
Expand `test/concurrent.test.ts`: existing 20-file test already present. Add explicit 10-concurrent-same-file test with assertion that final value matches one of the written versions.

### 3. Edge case tests (task-1775571997853)
Expand `test/edge-cases.test.js` or `test/edge-cases.test.ts`: add empty path rejection test for all backends, cross-backend consistency assertions.

### 4. README performance table (task-1775572006098)
README already has all required columns (Read large, Storage Limit, Browser Support, Best For). Verify and add SQLiteBackend row to Storage Limits table if missing.

## File Paths
- `test/backends/memory.test.js` — new
- `test/backends/local-storage.test.js` — new
- `test/backends/opfs.test.js` — new (browser-only, skip in Node)
- `test/concurrent.test.ts` — expand
- `test/edge-cases.test.js` — expand
- `README.md` — verify/patch table
