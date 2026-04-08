# Product Requirements Document: agentic-filesystem

## Overview

`agentic-filesystem` is a TypeScript ESM library providing a virtual filesystem for AI agents. It abstracts storage behind a unified `StorageBackend` interface, supporting multiple runtime environments (Node.js, browser OPFS, IndexedDB, SQLite, localStorage, in-memory) with built-in agent tool definitions, permissions, and semantic search.

## §1 Core Filesystem Operations

### §1.1 StorageBackend Interface

All backends must implement the `StorageBackend` interface (`src/types.ts`):

- `get(path)` — Read file content by absolute path (`/`-prefixed). Returns `string | null`.
- `set(path, content)` — Write content to path, creating parent directories as needed.
- `delete(path)` — Delete file at path. No-op if not found (no throw).
- `list(prefix?)` — List all file paths, optionally filtered by prefix. Returns `string[]` with `/`-prefixed paths.
- `scan(pattern)` — Search all files for literal string pattern. Returns `{ path, line, content }[]` with 1-based line numbers.
- `scanStream(pattern)` — Streaming variant of scan. Returns `AsyncIterable<{ path, line, content }>`.
- `batchGet(paths)` — Get multiple files by path in one call. Returns `Record<string, string | null>`.
- `batchSet(entries)` — Write multiple files in parallel. Takes `Record<string, string>`.
- `stat?(path)` — Get file metadata (size, mtime, isDirectory, permissions). Optional method.

### §1.2 AgenticFileSystem API

The `AgenticFileSystem` class wraps a `StorageBackend` and provides:

- `read(path)` / `write(path, content)` / `delete(path)` — Core CRUD with permission checks and error handling.
- `ls(prefix?)` — List files with metadata (name, type, size, mtime). Returns `LsResult[]`.
- `tree(prefix?)` — Recursive directory tree. Returns `TreeNode[]`.
- `grep(pattern, options?)` — Search files. Supports literal and semantic search modes.
- `batchGet(paths)` / `batchSet(entries)` — Batch operations exposed as public methods.
- `scanStream(pattern)` — Streaming grep exposed as public method.

### §1.3 Path Normalization

All paths across all backends must be absolute strings starting with `/`. The `list()` method must return paths consistently with `/` prefix across AgenticStoreBackend, OPFSBackend, and NodeFsBackend.

### §1.4 Runtime Auto-Selection

`createBackend(options?)` auto-selects the best backend based on runtime:

1. Explicit `sqliteDb` option → `SQLiteBackend`
2. Node.js with `better-sqlite3` → `SQLiteBackend` (auto-created DB)
3. Node.js without `better-sqlite3` → `NodeFsBackend`
4. Browser with OPFS → `OPFSBackend`
5. Browser with IndexedDB → `AgenticStoreBackend` (IDB adapter)
6. Fallback → `MemoryStorage`

## §2 File Metadata & Advanced Operations

### §2.1 stat() Implementation

All backends must implement `stat(path)` returning:

```typescript
{ size: number; mtime: number; isDirectory: boolean; permissions: Permission }
```

- `size` — File size in bytes.
- `mtime` — Modification time as Unix milliseconds.
- `isDirectory` — Whether path is a directory.
- `permissions` — `{ read: boolean; write: boolean }`.

NodeFsBackend must use actual filesystem metadata. AgenticStoreBackend must track mtime on write. OPFSBackend must support directory stat.

### §2.2 Symlink Support

NodeFsBackend must resolve symlinks via `realpath` and detect/skip symlink cycles.

### §2.3 Batch Operations

All three primary backends (AgenticStore, OPFS, NodeFs) must implement `batchGet` and `batchSet`. These must also be exposed as `AgenticFileSystem` public methods and as agent tools (`batch_get`, `batch_set`).

## §3 Error Handling & Security

### §3.1 Typed Error Classes

All errors must use typed classes from `src/errors.ts`:

- `NotFoundError` — File not found at path.
- `PermissionDeniedError` — Operation denied by permission or readOnly mode.
- `IOError` — Underlying I/O failure.

### §3.2 Error Consistency

Backends must not silently swallow errors. `delete()` must no-op on missing files (not throw). `walkDir()` must gracefully skip bad entries (not throw). All backends must use the same error patterns.

### §3.3 Permission System

`AgenticFileSystem` supports per-path permissions via `FileSystemConfig.permissions`:

```typescript
permissions?: Record<string, Permission>  // Permission = { read: boolean; write: boolean }
```

Permission checks use longest-prefix matching. `setPermission(path, perm)` allows runtime updates.

### §3.4 Read-Only Mode

`FileSystemConfig.readOnly` prevents all write operations (`write`, `delete`, `batchSet`). Writes return `PermissionDeniedError` without calling the backend.

## §4 Testing Requirements

### §4.1 Per-Backend Test Suites

Each backend must have dedicated test files covering `get`, `set`, `delete`, `list`, `scan`, `stat`, `batchGet`, `batchSet`, and `scanStream`.

### §4.2 Cross-Backend Consistency Tests

A shared test suite must verify that all backends produce identical results for the same operations. At minimum: CRUD, list path format, scan results, stat metadata, and batch operations.

### §4.3 Edge Case Tests

Tests must cover:

- Empty path handling
- Special characters in paths and content
- Concurrent write safety
- Large file handling
- Missing file behavior (get returns null, delete no-ops)

### §4.4 Error Type Tests

Tests must verify correct error types are thrown/returned: `NotFoundError`, `PermissionDeniedError`, `IOError` propagation across all backends.

### §4.5 Agent Tool Tests

Tests must verify `getToolDefinitions()` returns valid schemas and `executeTool()` dispatches correctly for all tools: `file_read`, `file_write`, `grep`, `ls`, `file_delete`, `file_tree`, `batch_get`, `batch_set`, `grep_stream`.

## §5 Documentation Requirements

### §5.1 README

README.md must include:

- Project description and motivation
- Backend configuration table (constructor, options, environment)
- Usage examples for each backend
- Performance comparison table
- Browser support matrix

### §5.2 JSDoc

- `StorageBackend` interface — all methods must have JSDoc comments.
- `AgenticFileSystem` — all public methods must have JSDoc comments.
- Backend classes — class-level and method-level JSDoc comments.

### §5.3 Architecture Documentation

ARCHITECTURE.md must document:

- StorageBackend interface definition
- Backend implementations with descriptions
- Agent tool layer (shell tools + file tools)
- Runtime auto-selection logic

## §6 Agent Tool Integration

### §6.1 File Tools (via AgenticFileSystem)

`getToolDefinitions()` returns MCP-compatible tool schemas:

| Tool | Description |
|------|-------------|
| `file_read` | Read file contents |
| `file_write` | Write content to file |
| `grep` | Search files (literal or semantic) |
| `ls` | List files in directory |
| `file_delete` | Delete a file |
| `file_tree` | Recursive directory tree |
| `batch_get` | Read multiple files |
| `batch_set` | Write multiple files |
| `grep_stream` | Stream grep results |

### §6.2 Shell Tools (via ShellFS)

`shellFsTools` exports MCP-compatible shell tool definitions:

| Tool | Description |
|------|-------------|
| `shell_cat` | Read full file content |
| `shell_head` | Read first N lines |
| `shell_tail` | Read last N lines |
| `shell_find` | List files by name pattern |
| `shell_delete` | Delete a file |
| `shell_tree` | Recursive directory tree |

### §6.3 Semantic Search

When an `EmbedBackend` is configured, `grep(pattern, { semantic: true })` performs embedding-based search instead of literal matching.
