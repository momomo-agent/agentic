# m18 Technical Design — Test Fix, JSDoc Completeness & Public API Exposure

## Overview

Three focused tasks: a one-line test import fix, JSDoc additions across 6 backend files, and exposing 3 backend methods on AgenticFileSystem with agent tool integration.

## 1. Fix failing agentic-store-stat.test.ts import path (task-1775586154139)

**Problem:** `test/backends/agentic-store-stat.test.ts` line 3 imports from `../../src/backends/agentic-store.js`. The test runner resolves `.js` extensions against compiled output, but the project uses `node:test` with `tsx` or similar loader. The import path should match the pattern used by other test files.

**Approach:**
- Inspect how other test files import `AgenticStoreBackend` (check `test/backends/*.test.ts` for working import patterns)
- Update line 3 of `test/backends/agentic-store-stat.test.ts` to match
- Most likely fix: change import to `../../src/backends/agentic-store.ts` (drop `.js` extension) or use the barrel export from `../../dist/index.js`
- Run `npm test` to confirm 483/483 pass

**Files to modify:**
- `test/backends/agentic-store-stat.test.ts` (line 3 only)

## 2. Add JSDoc to all backend class methods (task-1775586160070)

**Problem:** All 6 backend classes have zero JSDoc on public methods. The `StorageBackend` interface in `types.ts` already has JSDoc — backend implementations should match.

**Approach:**
Add Style A block JSDoc (with `@param` and `@returns`) to each public method on each backend class.

**Files to modify (6 files):**
- `src/backends/agentic-store.ts` — methods: get, set, delete, list, scan, scanStream, batchGet, batchSet, stat
- `src/backends/opfs.ts` — methods: get, set, delete, list, scan, scanStream, batchGet, batchSet, stat
- `src/backends/node-fs.ts` — methods: get, set, delete, list, scan, scanStream, batchGet, batchSet, stat
- `src/backends/memory.ts` — methods: get, set, delete, list, scan, scanStream, batchGet, batchSet
- `src/backends/local-storage.ts` — methods: get, set, delete, list, scan, scanStream, batchGet, batchSet (no stat — optional in interface)
- `src/backends/sqlite.ts` — methods: get, set, delete, list, scan, scanStream, batchGet, batchSet, stat

**JSDoc template (example for `get`):**
```ts
/**
 * Get file content by path.
 * @param path Absolute path starting with /
 * @returns File content string, or null if not found
 */
```

**Pattern reference:** Use the JSDoc from `StorageBackend` interface in `src/types.ts` as the canonical description. Backend JSDoc should describe behavior, not just restate the type signature.

**Edge cases to document in JSDoc where applicable:**
- `stat()`: Returns null for missing paths, `{ size, mtime, isDirectory }` for existing
- `delete()`: No-op (no throw) for missing paths
- `scan()`: Returns empty array if no matches
- `batchGet()`: Missing paths return null in the record
- `list(prefix?)`: No prefix returns all paths

## 3. Expose batchGet/batchSet/scanStream as public methods (task-1775586160174)

**Problem:** `AgenticFileSystem` exposes `read`, `write`, `delete`, `ls`, `grep`, `tree` but NOT `batchGet`, `batchSet`, `scanStream`. These are implemented on all backends but have no public API or agent tool integration.

**Approach — Part A: Public methods on AgenticFileSystem**

In `src/filesystem.ts`, add 3 new methods to the `AgenticFileSystem` class:

```ts
/**
 * Batch-get multiple files by path.
 * @param paths Array of absolute paths
 * @returns Record mapping each path to its content, or null if not found
 */
async batchGet(paths: string[]): Promise<Record<string, string | null>> {
  return this.storage.batchGet(paths)
}

/**
 * Batch-set multiple files at once. Throws if readOnly.
 * @param entries Record mapping absolute paths to content strings
 */
async batchSet(entries: Record<string, string>): Promise<void> {
  if (this.readOnly) throw new PermissionDeniedError('/')
  return this.storage.batchSet(entries)
}

/**
 * Stream grep results as an async iterable.
 * @param pattern Search pattern (string or regex source)
 * @returns AsyncIterable yielding { path, line, content } objects
 */
scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
  return this.storage.scanStream(pattern)
}
```

**Approach — Part B: Agent tool definitions**

In `getToolDefinitions()`, add 3 new tool objects to the returned array:

```ts
{
  name: 'batch_get',
  description: 'Read multiple files at once by path',
  parameters: {
    type: 'object',
    properties: { paths: { type: 'array', items: { type: 'string' }, description: 'Array of absolute file paths' } },
    required: ['paths']
  }
},
{
  name: 'batch_set',
  description: 'Write multiple files at once',
  parameters: {
    type: 'object',
    properties: {
      entries: { type: 'object', additionalProperties: { type: 'string' }, description: 'Map of path to content' }
    },
    required: ['entries']
  }
},
{
  name: 'grep_stream',
  description: 'Stream grep results for large result sets',
  parameters: {
    type: 'object',
    properties: { pattern: { type: 'string', description: 'Search pattern' } },
    required: ['pattern']
  }
}
```

**Approach — Part C: executeTool dispatch**

In `executeTool()`, add 3 new cases to the switch statement:

```ts
case 'batch_get': return this.batchGet(input.paths as string[])
case 'batch_set': return this.batchSet(input.entries as Record<string, string>)
case 'grep_stream': {
  const results: Array<{ path: string; line: number; content: string }> = []
  for await (const r of this.scanStream(input.pattern as string)) {
    results.push(r)
  }
  return results
}
```

Note: `grep_stream` collects the async iterable into an array for `executeTool` since tool dispatch must return a plain value. The raw `scanStream()` method on the class remains an async iterable for direct callers.

**Files to modify:**
- `src/filesystem.ts` (3 new methods + tool definitions + executeTool cases)

**Dependencies:** None — all backends already implement these methods.

**Test cases to verify:**
- `AgenticFileSystem.batchGet(['/a', '/b'])` returns correct record
- `AgenticFileSystem.batchSet({ '/a': 'x', '/b': 'y' })` persists correctly
- `AgenticFileSystem.scanStream('pattern')` yields results via `for await`
- `executeTool('batch_get', { paths: [...] })` works
- `executeTool('batch_set', { entries: {...} })` works
- `executeTool('grep_stream', { pattern: '...' })` works
- `getToolDefinitions()` returns 9 tools (6 existing + 3 new)
