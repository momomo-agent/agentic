# M10 DBB — stat() Implementation & Agent Tool Completeness

## DBB-001: stat() returns isDirectory field
- Given: Call `stat(path)` on AgenticStoreBackend or OPFSBackend with existing file
- Then: Returns `{size: number, mtime: number, isDirectory: boolean}`

## DBB-002: stat() returns null for missing paths
- Given: Call `stat('/nonexistent')` on any backend
- Then: Returns `null`

## DBB-003: file_delete and file_tree in getToolDefinitions()
- Given: `new AgenticFileSystem(config).getToolDefinitions()`
- Then: Array includes entries with `name: 'file_delete'` and `name: 'file_tree'`

## DBB-004: createAutoBackend() exported from index
- Given: `import { createAutoBackend } from 'agentic-filesystem'`
- Then: Returns StorageBackend appropriate for current runtime
