# Add permissions field to stat() result across all backends

## Changes Made

1. **src/types.ts** — Updated `stat()` return type to include `permissions: Permission` (reusing existing `Permission` type)
2. **src/backends/agentic-store.ts** — Added `permissions: { read: true, write: true }` to stat() return
3. **src/backends/opfs.ts** — Added `permissions: { read: true, write: true }` to both file and directory stat paths
4. **src/backends/node-fs.ts** — Computes real OS permissions from `mode` bits (`0o400` for owner read, `0o200` for owner write)
5. **src/backends/memory.ts** — Added new `stat()` method with `permissions: { read: true, write: true }`
6. **src/backends/sqlite.ts** — Added `permissions: { read: true, write: true }` to stat() return
7. **src/backends/local-storage.ts** — Added new `stat()` method with `permissions: { read: true, write: true }`

## Verification

- TypeScript compilation passes with no errors (`npx tsc --noEmit`)
- All existing stat tests remain compatible (they don't assert on permissions field)
- All 7 backends now consistently return `permissions` field from `stat()`
