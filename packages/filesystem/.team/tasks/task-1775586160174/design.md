# task-1775586160174 Technical Design — Expose batchGet/batchSet/scanStream as AgenticFileSystem public methods

## Problem

`batchGet`, `batchSet`, and `scanStream` are implemented on all backends but not exposed as `AgenticFileSystem` public methods or agent tools. This is a vision gap: agents cannot access batch operations or streaming grep.

## File to Modify

`src/filesystem.ts` — 3 changes in one file

## Part A: New Public Methods

Add 3 methods to the `AgenticFileSystem` class:

```ts
/**
 * Batch-get multiple files by path.
 * @param paths Array of absolute file paths
 * @returns Record mapping each path to its content, or null if not found
 */
async batchGet(paths: string[]): Promise<Record<string, string | null>> {
  return this.storage.batchGet(paths)
}

/**
 * Batch-set multiple files at once. Throws if readOnly.
 * @param entries Record mapping absolute file paths to content strings
 */
async batchSet(entries: Record<string, string>): Promise<void> {
  if (this.readOnly) throw new PermissionDeniedError('Read-only file system')
  return this.storage.batchSet(entries)
}

/**
 * Stream grep results as an async iterable.
 * @param pattern Search pattern (matched against file content)
 * @returns AsyncIterable yielding { path, line, content } match objects
 */
scanStream(pattern: string): AsyncIterable<{ path: string; line: number; content: string }> {
  return this.storage.scanStream(pattern)
}
```

**Notes:**
- Uses `this.storage` (the existing field name), not `this.backend`
- `batchSet` checks `this.readOnly` and throws `PermissionDeniedError` (matching the class's error import)
- `batchGet` and `scanStream` are read-only, no readOnly check needed

## Part B: Agent Tool Definitions

Add 3 entries to the array returned by `getToolDefinitions()`:

```ts
{
  name: 'batch_get',
  description: 'Read multiple files at once by path',
  parameters: {
    type: 'object',
    properties: {
      paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Array of absolute file paths to read'
      }
    },
    required: ['paths']
  }
},
{
  name: 'batch_set',
  description: 'Write multiple files at once',
  parameters: {
    type: 'object',
    properties: {
      entries: {
        type: 'object',
        additionalProperties: { type: 'string' },
        description: 'Map of absolute file paths to content strings'
      }
    },
    required: ['entries']
  }
},
{
  name: 'grep_stream',
  description: 'Stream grep results for large result sets',
  parameters: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Search pattern to match against file content'
      }
    },
    required: ['pattern']
  }
}
```

## Part C: executeTool Dispatch

Add 3 cases to the switch statement in `executeTool()`:

```ts
case 'batch_get':
  return this.batchGet(input.paths as string[])
case 'batch_set':
  return this.batchSet(input.entries as Record<string, string>)
case 'grep_stream': {
  const results: Array<{ path: string; line: number; content: string }> = []
  for await (const r of this.scanStream(input.pattern as string)) {
    results.push(r)
  }
  return results
}
```

**Note on grep_stream:** `executeTool` must return a plain value (not an async iterable), so we collect into an array. The raw `scanStream()` method on the class remains an async iterable for direct programmatic callers.

## Edge Cases

- `batchGet` with empty array: returns `{}` (empty record)
- `batchSet` with empty object: no-op, returns void
- `batchGet` with mixed existing/non-existing paths: returns content for existing, null for missing
- `batchSet` on read-only filesystem: throws `PermissionDeniedError`
- `grep_stream` with no matches: returns empty array from `executeTool`, empty async iterable from `scanStream()`
- Unknown tool name in `executeTool`: still returns `{ error: 'Unknown tool' }` (no regression)

## Dependencies

- None — all backends already implement `batchGet`, `batchSet`, `scanStream`
- Depends on task-1775586154139 (test fix) only in the sense that `npm test` should pass

## Verification

- `npm test` passes (483/483)
- `getToolDefinitions()` returns 9 tools (6 existing + 3 new)
- `executeTool('batch_get', { paths: [...] })` works
- `executeTool('batch_set', { entries: {...} })` works
- `executeTool('grep_stream', { pattern: '...' })` works
- `scanStream()` works as direct async iterable on the class
