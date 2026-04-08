# M3 Done-By-Definition (DBB)

## localStorage Backend
- [ ] `LocalStorageBackend` class exported from `src/backends/local-storage.ts`
- [ ] Implements all `StorageBackend` methods: `get`, `set`, `delete`, `list`, `scan`, `batchGet`, `batchSet`
- [ ] All paths returned by `list()` start with `/`
- [ ] Passes the shared backend test suite (same tests as NodeFsBackend/OPFSBackend/AgenticStoreBackend)
- [ ] Exported from `src/index.ts`

## ShellFS Agent Tool Definitions
- [ ] `shellFsTools` array exported from `src/shell-tools.ts`
- [ ] Covers: `cat`, `head`, `tail`, `find` commands
- [ ] Each tool definition has: `name`, `description`, `input_schema` (JSON Schema)
- [ ] Re-exported from `src/index.ts`

## Concrete EmbedBackend
- [ ] `TfIdfEmbedBackend` (or equivalent) class exported from `src/backends/tfidf-embed.ts`
- [ ] Implements `EmbedBackend`: `encode(text): Promise<number[]>` and `search(embedding, topK?): Promise<{path, score}[]>`
- [ ] Can index files from a `StorageBackend` via `index(storage: StorageBackend): Promise<void>`
- [ ] Exported from `src/index.ts`

## Directory Tree API
- [ ] `TreeNode` type exported from `src/types.ts`: `{ name: string; type: 'file'|'dir'; children?: TreeNode[] }`
- [ ] `tree(prefix?: string): Promise<TreeNode>` method on `AgenticFileSystem`
- [ ] Returns nested structure reflecting actual path hierarchy from `storage.list()`
- [ ] Root node has `name: prefix ?? '/'` and `type: 'dir'`

## Basic Permissions System
- [ ] `PermissionMap` type exported from `src/types.ts`: `Record<string, { read: boolean; write: boolean; execute: boolean }>`
- [ ] `FileSystemConfig` accepts optional `permissions?: PermissionMap`
- [ ] `read()` enforces read permission; returns `{ error: PermissionDeniedError.message }` if denied
- [ ] `write()` and `delete()` enforce write permission; returns `{ error: PermissionDeniedError.message }` if denied
- [ ] Permission lookup: exact path match → longest prefix match → allow by default
