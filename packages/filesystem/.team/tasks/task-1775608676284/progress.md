# Expose permissions field in stat() result across all backends

## Progress

The permissions field was already implemented across all 6 backends. Work focused on verification and gap closure.

## Changes Made
1. **src/types.ts** — Updated `stat()` JSDoc to document the `permissions` field (was only mentioning size/mtime)
2. **test/m19-stat-permissions.test.js** — Added two edge-case tests:
   - Read-only file (0o444) → `write: false`
   - Owner-writable file (0o644) → both `true`
   - Added `chmod` import for the new tests

## Verification
- Build: `npx tsup` — success
- Tests: `node --test test/m19-stat-permissions.test.js` — 17/17 pass
  - Covers AgenticStoreBackend, NodeFsBackend, MemoryStorage, LocalStorageBackend, SQLiteBackend
  - Cross-backend consistency tests pass
  - Edge cases for Unix mode bits pass
