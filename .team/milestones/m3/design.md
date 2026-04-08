# M3 Technical Design: Storage Backends & Agent Tooling

## Overview
Five independent deliverables: localStorage backend, ShellFS tool definitions, TF-IDF embed backend, directory tree API, and basic permissions system.

## New Files
- `src/backends/local-storage.ts` — localStorage adapter
- `src/shell-tools.ts` — AI agent tool definitions for ShellFS
- `src/backends/tfidf-embed.ts` — TF-IDF based EmbedBackend

## Modified Files
- `src/types.ts` — add `TreeNode`, `PermissionMap`, update `FileSystemConfig`
- `src/filesystem.ts` — add `tree()` method, permission enforcement in `read/write/delete`
- `src/index.ts` — export all new modules

## Key Design Decisions

### localStorage Backend
- Uses `window.localStorage` (browser-only); key prefix `afs:` to namespace entries
- Path normalization: ensure leading `/` on all stored keys
- `scan()` iterates all prefixed keys, splits by `\n`, filters by pattern substring match
- `batchGet`/`batchSet` implemented as parallel loops (same pattern as MemoryStorage)

### ShellFS Tool Definitions
- Static array of Anthropic-style tool objects (name/description/input_schema)
- No runtime dependency — pure data, no ShellFS instance needed at definition time
- Tools: `shell_cat`, `shell_head`, `shell_tail`, `shell_find`

### TF-IDF EmbedBackend
- In-memory TF-IDF vectors; no external dependencies
- `index(storage)` loads all files and builds term-frequency map
- `encode(text)` returns sparse TF-IDF vector as dense `number[]` over known vocabulary
- `search(embedding, topK=5)` computes cosine similarity against indexed docs

### Directory Tree API
- `TreeNode` added to `src/types.ts`
- `AgenticFileSystem.tree(prefix?)` calls `storage.list(prefix)`, then builds nested structure by splitting paths on `/`
- Pure transformation — no new storage calls beyond `list()`

### Basic Permissions System
- `PermissionMap` and updated `FileSystemConfig` in `src/types.ts`
- `AgenticFileSystem` stores `permissions` map; helper `checkPermission(path, mode)` does longest-prefix lookup
- `read/write/delete` call `checkPermission` before delegating to storage
- Default: allow all (no entry = permitted)
