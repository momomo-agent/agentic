# m17: Cross-Backend Consistency, OPFS Hardening & SQLite Auto-Selection

## Goals
- Add cross-backend consistency tests ensuring all backends pass the same contract suite (Architecture gap: missing, PRD §4: missing)
- OPFSBackend empty-path validation to match other backends (Architecture gap: missing)
- OPFSBackend delete() graceful error handling (no-op on missing path, matching other backends) (Architecture gap: partial)
- SQLiteBackend included in createBackend() auto-selection chain (Vision gap: missing)
- OPFSBackend walkDir() graceful error handling — log and skip bad entries instead of throwing (Architecture gap: partial, PRD §1: partial)

## Acceptance Criteria
- A shared contract test suite runs against MemoryStorage, AgenticStoreBackend, NodeFsBackend, and passes consistently
- OPFSBackend rejects empty paths with the same validation as AgenticStoreBackend/NodeFsBackend
- OPFSBackend.delete() silently succeeds when path doesn't exist (matching other backends)
- createBackend() tries SQLite before falling back to Memory when in Node.js with sqlite available
- OPFSBackend.walkDir() logs errors and continues traversal instead of throwing
