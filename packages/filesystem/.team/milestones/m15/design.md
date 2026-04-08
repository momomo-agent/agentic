# M15 Technical Design — Error Handling Hardening, Validation & Cross-Backend Tests

## Overview
Three targeted fixes to OPFSBackend + a cross-backend consistency test suite + ARCHITECTURE.md.

## 1. OPFSBackend.delete() — no-op on missing path
File: `src/backends/opfs.ts`

Wrap `dir.removeEntry()` in try/catch. Swallow `NotFoundError` / `DOMException` with name `NotFoundError`. Re-throw anything else.

## 2. OPFSBackend.walkDir() — continue on entry error
File: `src/backends/opfs.ts`

Move the try/catch inside the loop body so a single bad entry is skipped. Log the error but do not throw.

## 3. OPFSBackend empty-path validation
File: `src/backends/opfs.ts`

Add `private validatePath(path: string): void` that throws `new IOError('Path cannot be empty')` when `path === ''`. Call it at the top of `get`, `set`, `delete`.

## 4. Cross-backend consistency test suite
File: `test/cross-backend.test.js` (extend existing file or create if absent)

Use a shared `runBackendSuite(backend)` helper. Instantiate NodeFsBackend (tmp dir) and AgenticStoreBackend (in-memory). OPFSBackend is browser-only — mock or skip with `globalThis.navigator` guard.

## 5. ARCHITECTURE.md
File: `ARCHITECTURE.md` (project root)

Document: StorageBackend interface contract, three backend implementations, agent tool layer (shell-tools.ts), runtime auto-selection (createBackend / createAutoBackend).
