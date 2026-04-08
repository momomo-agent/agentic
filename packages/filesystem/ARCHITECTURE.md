# Architecture

## Overview

`agentic-filesystem` is a virtual filesystem library designed for AI agents. It provides a unified `AgenticFileSystem` API over swappable storage backends, with built-in support for permissions, semantic search, and MCP-compatible tool definitions.

## StorageBackend Interface

Defined in `src/types.ts`. All backends implement:

```ts
interface StorageBackend {
  get(path: string): Promise<string | null>
  set(path: string, content: string): Promise<void>
  delete(path: string): Promise<void>
  list(prefix?: string): Promise<string[]>
  scan(pattern: string): Promise<Array<{ path: string; line: number; content: string }>>
  scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }>
  batchGet(paths: string[]): Promise<Record<string, string | null>>
  batchSet(entries: Record<string, string>): Promise<void>
  stat?(path: string): Promise<{ size: number; mtime: number; isDirectory: boolean } | null>
}
```

All paths are absolute strings starting with `/`. `stat()` is optional.

## Backend Implementations

### AgenticStoreBackend (`src/backends/agentic-store.ts`)
Wraps any key-value store implementing `{ get, set, delete, keys, has }`. Works in both browser and Node.js. Used as the IndexedDB adapter in `createBackend()`.

### OPFSBackend (`src/backends/opfs.ts`)
Uses the browser's Origin Private File System API (`navigator.storage.getDirectory()`). Available in Chrome 86+ and Safari 15.2+. ~10x faster than IndexedDB for large files. Browser-only.

### NodeFsBackend (`src/backends/node-fs.ts`)
Uses Node.js `fs/promises` with a configurable `root` directory. Supports symlinks (resolves with `realpath`, skips cycles). For server-side and Electron main process use.

### MemoryStorage (`src/backends/memory.ts`)
In-memory `Map`-based store. No persistence. Useful for testing and ephemeral sessions.

### LocalStorageBackend (`src/backends/local-storage.ts`)
Wraps `window.localStorage`. Browser-only, synchronous storage exposed via async interface.

### SQLiteBackend (`src/backends/sqlite.ts`)
SQLite-backed storage via a `Database` adapter. For persistent server-side use without a full filesystem.

## Agent Tool Layer

`src/shell-tools.ts` exports `shellFsTools: ShellTool[]` — MCP-compatible tool definitions:

| Tool | Description |
|------|-------------|
| `shell_cat` | Read full file content |
| `shell_head` | Read first N lines |
| `shell_tail` | Read last N lines |
| `shell_find` | List files by name pattern |
| `shell_delete` | Delete a file |
| `shell_tree` | Recursive directory tree |

`AgenticFileSystem.getToolDefinitions()` returns a parallel set of tool schemas (`file_read`, `file_write`, `grep`, `ls`, `file_delete`, `file_tree`) for direct agent integration. `executeTool(name, input)` dispatches calls to the corresponding methods.

`src/shell.ts` exports `ShellFS` — a higher-level shell-like interface wrapping `AgenticFileSystem`.

## Runtime Auto-Selection

`createBackend(options?)` in `src/index.ts` selects a backend based on the runtime environment:

1. **Node.js** (`process.versions.node` present) → `NodeFsBackend(rootDir ?? process.cwd())`
2. **Browser with OPFS** (`navigator.storage.getDirectory()` succeeds) → `OPFSBackend`
3. **Browser with IndexedDB** (`indexedDB` available) → `AgenticStoreBackend` over an inline IDB store
4. **Fallback** → `MemoryStorage`

`createDefaultBackend` and `createAutoBackend` are aliases for `createBackend`.


Re-run gap analysis on current codebase to get accurate PRD and architecture match scores. The 3 architecture 'missing' gaps (ARCHITECTURE.md, OPFS empty-path, cross-backend tests) and 5 PRD 'missing' gaps (per-backend tests, cross-backend tests, edge case tests, README, config docs) appear to already be addressed. New scores should reflect m15-m21 completion.