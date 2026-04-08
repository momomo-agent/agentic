# Task Design: Add JSDoc to NodeFsBackend

## File to Modify
- `src/backends/node-fs.ts` — add JSDoc comments to class and all public methods

## Reference Style
Match the JSDoc style used in `src/backends/memory.ts` and `src/backends/agentic-store.ts`:
- Class-level: `/** description */` with optional `@example`
- Method-level: `/** description */` with `@param name description` and `@returns description`
- Concise, 1-sentence descriptions

## Exact Changes

### 1. Class-level JSDoc (insert before line 12: `export class NodeFsBackend`)
```ts
/**
 * Node.js filesystem backend for server-side and Electron main process use.
 * Uses dynamic imports so bundlers don't include fs/promises in browser builds.
 * @example
 * const fs = new AgenticFileSystem({ storage: new NodeFsBackend('/data') })
 */
```

### 2. `get` method (before line 24)
```ts
  /**
   * Get file content by path.
   * @param path Absolute path starting with /
   * @returns File content string, or null if not found
   */
```

### 3. `set` method (before line 34)
```ts
  /**
   * Write content to a file path. Creates parent directories automatically.
   * @param path Absolute path starting with /
   * @param content File content to write
   */
```

### 4. `delete` method (before line 45)
```ts
  /**
   * Delete a file. No-op if path does not exist.
   * @param path Absolute path starting with /
   */
```

### 5. `list` method (before line 52)
```ts
  /**
   * List file paths, optionally filtered by prefix. Resolves symlinks and skips cycles.
   * @param prefix Optional path prefix to filter results
   * @returns Array of absolute file paths
   */
```

### 6. `scanStream` method (before line 84)
```ts
  /**
   * Stream search results as an async iterable, reading files line by line.
   * @param pattern String pattern to match against file content
   * @returns AsyncIterable yielding { path, line, content } objects
   */
```

### 7. `scan` method (before line 100)
```ts
  /**
   * Search file contents for a pattern.
   * @param pattern String pattern to match against file content
   * @returns Array of match objects with path, line number, and content
   */
```

### 8. `batchGet` method (before line 106)
```ts
  /**
   * Get multiple files by path in a single operation.
   * @param paths Array of absolute paths
   * @returns Record mapping each path to its content, or null if not found
   */
```

### 9. `batchSet` method (before line 111)
```ts
  /**
   * Write multiple files in a single operation.
   * @param entries Record mapping absolute paths to content strings
   */
```

### 10. `stat` method (before line 115)
```ts
  /**
   * Get file metadata including size, mtime, and permissions.
   * @param path Absolute path starting with /
   * @returns Object with size, mtime, isDirectory, permissions
   */
```

## Private Methods (no JSDoc needed)
- `abs(p)` — internal path resolution
- `validatePath(p)` — internal validation
- `walk(dir, out, visited)` — internal recursive directory walk

## Edge Cases
- None — this is documentation-only, no logic changes

## Verification
1. `npx tsup` — build succeeds with no errors
2. `node --test` — all existing tests pass unchanged
3. Visual: JSDoc style matches `memory.ts` and `agentic-store.ts` exactly
