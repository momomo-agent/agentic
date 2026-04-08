# M14 DBB - stat() Parity, Agent Tool Completeness & Auto Backend Selection

## DBB-001: OPFSBackend.stat() existing file
- Requirement: task-1775575221748
- Given: a file exists at `path` in OPFS storage
- Expect: `stat(path)` returns an object with numeric `size` and `mtime` fields
- Verify: returned object matches `{ size: number, mtime: number|Date }`

## DBB-002: OPFSBackend.stat() missing file
- Requirement: task-1775575221748
- Given: no file exists at `path` in OPFS storage
- Expect: `stat(path)` returns `null`
- Verify: return value is strictly `null`

## DBB-003: OPFSBackend.stat() size accuracy
- Requirement: task-1775575221748
- Given: a file written with known byte content (e.g. 100 bytes)
- Expect: `stat(path).size` equals the byte length of the written content
- Verify: write then stat, compare sizes

## DBB-004: AgenticStoreBackend.stat() existing key
- Requirement: task-1775575227913
- Given: a key exists in AgenticStore storage
- Expect: `stat(path)` returns an object with numeric `size` and `mtime` fields
- Verify: returned object matches `{ size: number, mtime: number|Date }`

## DBB-005: AgenticStoreBackend.stat() missing key
- Requirement: task-1775575227913
- Given: no key exists at `path` in AgenticStore storage
- Expect: `stat(path)` returns `null`
- Verify: return value is strictly `null`

## DBB-006: stat() interface parity across backends
- Requirement: task-1775575221748, task-1775575227913
- Given: same file written to OPFSBackend and AgenticStoreBackend
- Expect: both `stat()` calls return objects with identical shape `{ size, mtime }`
- Verify: field names and types match between backends

## DBB-007: file_delete agent tool — existing file
- Requirement: task-1775575245337
- Given: a file exists; agent calls `executeTool('file_delete', { path })`
- Expect: tool returns success, file no longer accessible
- Verify: subsequent read/stat returns null or not-found error

## DBB-008: file_delete agent tool — missing file
- Requirement: task-1775575245337
- Given: no file at `path`; agent calls `executeTool('file_delete', { path })`
- Expect: tool returns an error or not-found result (does not throw unhandled exception)
- Verify: response indicates file was not found

## DBB-009: file_tree agent tool — non-empty directory
- Requirement: task-1775575245337
- Given: several files exist under a directory prefix; agent calls `executeTool('file_tree', { path })`
- Expect: tool returns a list/tree of all files under that path
- Verify: all written files appear in the result

## DBB-010: file_tree agent tool — empty directory
- Requirement: task-1775575245337
- Given: no files exist under the given path prefix
- Expect: tool returns an empty list/tree (not an error)
- Verify: result is empty collection

## DBB-011: file_delete and file_tree appear in tool definitions
- Requirement: task-1775575245337
- Given: `getToolDefinitions()` is called
- Expect: returned list includes entries for `file_delete` and `file_tree` with name and description
- Verify: both tool names present in definitions array

## DBB-012: createDefaultBackend() in Node.js environment
- Requirement: task-1775575261928
- Given: code runs in a Node.js process
- Expect: `createDefaultBackend()` returns a NodeFsBackend instance
- Verify: returned backend type/class is NodeFsBackend

## DBB-013: createDefaultBackend() in browser with OPFS available
- Requirement: task-1775575261928
- Given: code runs in a browser context where OPFS API is available
- Expect: `createDefaultBackend()` returns an OPFSBackend instance
- Verify: returned backend type/class is OPFSBackend

## DBB-014: createDefaultBackend() fallback when OPFS unavailable
- Requirement: task-1775575261928
- Given: code runs in an environment where neither Node.js fs nor OPFS is available
- Expect: `createDefaultBackend()` returns a MemoryStorage backend instance
- Verify: returned backend type/class is MemoryStorage (or equivalent in-memory backend)

## DBB-015: createDefaultBackend() returns functional backend
- Requirement: task-1775575261928
- Given: `createDefaultBackend()` is called in any supported environment
- Expect: returned backend can write and read a file without error
- Verify: write then read returns the same content
