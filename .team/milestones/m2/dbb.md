# M2 DBB — Public API Completeness & Developer Experience

## DBB-001: ShellFS exported from index.ts
- Given: Consumer imports from `agentic-filesystem`
- Expect: `ShellFS` is a named export
- Verify: `import { ShellFS } from 'agentic-filesystem'` resolves without error

## DBB-002: ShellFS usable by consumers
- Given: Consumer creates `new ShellFS(fs)` and calls `exec('ls /')`
- Expect: Returns a string result
- Verify: No runtime error; result is a string

## DBB-003: AgenticFileSystem public methods have JSDoc
- Given: `src/filesystem.ts` is read
- Expect: `read`, `write`, `delete`, `ls`, `grep`, `executeTool`, `getToolDefinitions` each have a `/** ... */` comment
- Verify: Every public method has JSDoc above its signature

## DBB-004: StorageBackend interface methods have JSDoc
- Given: `src/types.ts` is read
- Expect: `get`, `set`, `delete`, `list`, `scan` on `StorageBackend` each have JSDoc
- Verify: Every interface method has a `/** ... */` comment

## DBB-005: ls() returns size on NodeFsBackend
- Given: A file is written via NodeFsBackend, then `fs.ls()` is called
- Expect: The matching `LsResult` has `size` as a positive integer (bytes)
- Verify: `result.find(r => r.name === path).size > 0`

## DBB-006: ls() size is best-effort on other backends
- Given: `fs.ls()` called on AgenticStoreBackend or OPFSBackend
- Expect: `size` field is either a number or undefined — no crash
- Verify: No exception thrown; result is an array of LsResult

## DBB-007: LsResult includes mtime on NodeFsBackend
- Given: A file is written via NodeFsBackend, then `fs.ls()` is called
- Expect: The matching `LsResult` has `mtime` as a Date or number
- Verify: `result.find(r => r.name === path).mtime` is truthy

## DBB-008: MemoryStorage passes core contract
- Given: MemoryStorage backend used with AgenticFileSystem
- Expect: `set`/`get`/`delete`/`list`/`scan` all behave correctly
- Verify: Same shared backend contract test suite passes for MemoryStorage

## DBB-009: MemoryStorage is exported from index.ts
- Given: Consumer imports from `agentic-filesystem`
- Expect: `MemoryStorage` is a named export
- Verify: `import { MemoryStorage } from 'agentic-filesystem'` resolves

## DBB-010: StorageBackend interface has batchGet and batchSet
- Given: `src/types.ts` is read
- Expect: `batchGet(paths: string[]): Promise<Record<string, string | null>>` and `batchSet(entries: Record<string, string>): Promise<void>` are present on `StorageBackend`
- Verify: TypeScript compiles without error when calling both methods on any backend

## DBB-011: batchGet returns null for missing paths
- Given: `batchGet(['/exists', '/missing'])` where only `/exists` has content
- Expect: `{ '/exists': '<content>', '/missing': null }`
- Verify: Result object has correct keys and null for missing

## DBB-012: batchSet writes all entries
- Given: `batchSet({ '/x': 'v1', '/y': 'v2' })` then `batchGet(['/x', '/y'])`
- Expect: Both values returned correctly
- Verify: Passes on NodeFsBackend and AgenticStoreBackend

## DBB-013: Cross-backend consistency tests pass
- Given: `tests/cross-backend.test.js` run with `node --test`
- Expect: All get/set/delete/list/scan assertions pass for NodeFsBackend and AgenticStoreBackend
- Verify: Exit code 0, no failing tests

## DBB-014: Edge case tests pass
- Given: `tests/edge-cases.test.js` run with `node --test`
- Expect: Special chars, unicode, concurrent writes, multiline content all handled without error
- Verify: Exit code 0, no failing tests
