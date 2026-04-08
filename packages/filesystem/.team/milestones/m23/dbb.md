# m23: PRD Gap Closure — stat() Permissions, OPFS walkDir & Architecture Doc - DBB (验收标准)

## Milestone Goal
Close remaining PRD gaps: ensure permissions field is consistently exposed in stat() results, OPFS walkDir() handles errors gracefully, and ARCHITECTURE.md exists as the formal system design reference.

## Verification Criteria

### 1. stat() permissions field (task-1775608676284)
- [ ] `StorageBackend` interface in `src/types.ts` documents `permissions: Permission` in stat() return type
- [ ] All 6 backends (NodeFs, OPFS, AgenticStore, Memory, SQLite, LocalStorage) return `permissions: { read: boolean, write: boolean }` from stat()
- [ ] NodeFsBackend reads actual filesystem mode bits (0o400 for read, 0o200 for write)
- [ ] Non-filesystem backends return `{ read: true, write: true }` as default
- [ ] Test file `test/m19-stat-permissions.test.js` passes — covers all 5 non-OPFS backends + cross-backend consistency
- [ ] `node --test test/m19-stat-permissions.test.js` exits 0

### 2. OPFS walkDir() error handling (task-1775608676626)
- [ ] `walkDir()` in `src/backends/opfs.ts` has per-entry try/catch inside the for-await loop
- [ ] Catch block logs via `console.error` and does NOT rethrow (continues iteration)
- [ ] Test file `test/opfs-walkdir-error.test.js` verifies implementation structure via source inspection
- [ ] `node --test test/opfs-walkdir-error.test.js` exits 0

### 3. ARCHITECTURE.md (task-1775608676787)
- [ ] `ARCHITECTURE.md` exists at project root
- [ ] Documents StorageBackend interface contract
- [ ] Documents backend selection flow (createBackend auto-detection chain)
- [ ] Documents AgenticFileSystem class architecture (readOnly, permissions, tool definitions)
- [ ] Documents error type hierarchy (NotFoundError/PermissionDeniedError/IOError)
- [ ] Documents cross-backend consistency guarantees

### Cross-Cutting
- [ ] `npx tsup` builds without errors
- [ ] `node --test test/*.test.js` — full suite passes
- [ ] No regressions in existing stat(), walkDir(), or permissions tests
