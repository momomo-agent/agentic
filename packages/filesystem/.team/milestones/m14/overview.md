# M14: stat() Parity, Agent Tool Completeness & Auto Backend Selection

## Goals
- Implement `stat()` on OPFSBackend and AgenticStoreBackend (P0 vision/dbb gaps)
- Add `file_delete` and `file_tree` agent tool definitions (P1 vision gap)
- Implement `createDefaultBackend()` runtime auto-selection factory (P0 vision gap)

## Tasks
| ID | Title | Priority |
|----|-------|----------|
| task-1775575221748 | Implement OPFSBackend.stat() | P0 |
| task-1775575227913 | Implement AgenticStoreBackend.stat() | P0 |
| task-1775575245337 | Add agent tool definitions for delete and tree | P1 |
| task-1775575261928 | Implement automatic backend selection | P0 |

## Acceptance Criteria
- `OPFSBackend.stat(path)` returns `{size, mtime}` or `null`
- `AgenticStoreBackend.stat(path)` returns `{size, mtime}` or `null`
- `executeTool('file_delete', ...)` and `executeTool('file_tree', ...)` work correctly
- `createDefaultBackend()` returns NodeFsBackend in Node.js, OPFSBackend in browser with OPFS, MemoryStorage as fallback
