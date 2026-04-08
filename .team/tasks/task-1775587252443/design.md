# Technical Design: README with Usage Examples and Per-Backend Configuration Docs

## Task ID
task-1775587252443

## Goal
Close PRD §5 gap: README with usage examples for all backends, per-backend configuration docs, and performance comparison table.

## File to Modify
- `README.md` (project root)

## Current State Analysis

README.md already exists (263 lines) with extensive content. Audit against PRD §5:

| PRD §5 Requirement | Status | Action |
|---|---|---|
| Quick start with `createBackend()` | Missing | Add section |
| All 6 backend examples | Present | Verify completeness |
| Per-backend configuration options | Partial | Add config options per backend |
| Performance comparison table | Present | Verify accuracy |
| Browser support matrix | Present | Verify |
| Storage limits table | Present | Verify |
| StorageBackend interface docs | Partial | Add `scanStream`, `batchGet`, `batchSet`, `stat` |
| Custom backend example | Partial | Add `scanStream`, `batchGet`, `batchSet`, `stat` methods |
| Streaming scan example | Present | Verify |
| Agent tool integration | Present | Verify |

## Changes Required

### 1. Add `createBackend()` auto-selection section (after Quick Start)

```typescript
// Auto-selects best backend for your environment
import { createBackend, AgenticFileSystem } from 'agentic-filesystem'

const storage = createBackend()
const fs = new AgenticFileSystem({ storage })

// Node.js → NodeFsBackend(process.cwd())
// Browser + OPFS → OPFSBackend
// Browser + IndexedDB → AgenticStoreBackend
// Fallback → MemoryStorage
```

### 2. Update Custom Backend example to include all interface methods

Current example in README only shows `get/set/delete/list/scan`. Add:
- `scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }>`
- `batchGet(paths: string[]): Promise<Record<string, string | null>>`
- `batchSet(entries: Record<string, string>): Promise<void>`
- `stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null>`

### 3. Add per-backend configuration options for each backend

Add brief config descriptions:
- `NodeFsBackend(root: string)` — root directory path
- `OPFSBackend()` — no config, uses browser OPFS
- `AgenticStoreBackend(store)` — requires agentic-store instance
- `MemoryStorage()` — no config
- `LocalStorageBackend()` — no config, uses window.localStorage
- `SQLiteBackend(db)` — requires better-sqlite3 Database instance

## Edge Cases
- Documentation only — no code changes
- Must not break existing content
- Keep existing structure and add missing sections

## Dependencies
- None (documentation task)

## Test Cases to Verify
- Manual review: README covers all PRD §5 requirements
- All code examples are syntactically correct
- Links are valid
