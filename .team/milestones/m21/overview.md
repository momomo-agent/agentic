# Milestone m21: JSDoc Completeness, SQLite Auto-Selection & Public API Exposure

## Goal
Close remaining PRD and Vision gaps to push PRD match toward 90%.

## Scope
1. **JSDoc on backend classes** (PRD §5) — All backend class methods (AgenticStoreBackend, OPFSBackend, NodeFsBackend, MemoryBackend, SQLiteBackend, LocalStorageBackend) should have JSDoc comments matching the quality of the StorageBackend interface docs in types.ts.

2. **SQLiteBackend in createBackend() auto-selection** (Vision gap) — SQLiteBackend is not included in the createBackend() auto-selection chain (Node → OPFS → IndexedDB → Memory). Add SQLite to the chain with appropriate runtime detection.

3. **Expose batchGet/batchSet/scanStream as public API** (Vision gap) — These methods are implemented on backends but not exposed as AgenticFileSystem public methods or agent tools. Add them to the public API.

4. **Per-backend test coverage verification** (PRD §4) — Verify that each of the 6 backends has dedicated test coverage for core operations (get/set/delete/list/scan/stat). Fill any gaps.

## Success Criteria
- All 6 backend classes have JSDoc on public methods
- createBackend() includes SQLiteBackend in auto-selection
- AgenticFileSystem exposes batchGet(), batchSet(), scanStream() as public methods
- Each backend has verified test coverage for all core operations
- PRD match score increases from ~72% toward ≥85%
