# task-1775586160070 Technical Design — Add JSDoc to all backend class methods

## Problem

All 6 backend classes have zero JSDoc on public methods. The `StorageBackend` interface in `src/types.ts` already has JSDoc with `@param`/`@returns` tags — backend implementations should match.

## Files to Modify (6 files)

1. `src/backends/agentic-store.ts`
2. `src/backends/opfs.ts`
3. `src/backends/node-fs.ts`
4. `src/backends/memory.ts`
5. `src/backends/local-storage.ts`
6. `src/backends/sqlite.ts`

## Methods to Document

For backends with `stat()` (AgenticStore, OPFS, NodeFs, SQLite): 9 methods each
For backends without `stat` (MemoryStorage, LocalStorageBackend): 8 methods each

Methods: `get`, `set`, `delete`, `list`, `scan`, `scanStream`, `batchGet`, `batchSet`, `stat` (where applicable)

## JSDoc Format

Use Style A (block JSDoc with `@param` and `@returns`), matching the `StorageBackend` interface in `src/types.ts`:

```ts
/**
 * Get file content by path.
 * @param path Absolute path starting with /
 * @returns File content string, or null if not found
 */
```

## Per-Method JSDoc Templates

```ts
// get
/**
 * Get file content by path.
 * @param path Absolute path starting with /
 * @returns File content string, or null if not found
 */

// set
/**
 * Write content to a file path.
 * @param path Absolute path starting with /
 * @param content File content to write
 */

// delete
/**
 * Delete a file. No-op if path does not exist.
 * @param path Absolute path starting with /
 */

// list
/**
 * List file paths, optionally filtered by prefix.
 * @param prefix Optional path prefix to filter results
 * @returns Array of absolute file paths
 */

// scan
/**
 * Search file contents for a pattern.
 * @param pattern String pattern to match against file content
 * @returns Array of match objects with path, line number, and content
 */

// scanStream
/**
 * Stream search results as an async iterable.
 * @param pattern String pattern to match against file content
 * @returns AsyncIterable yielding { path, line, content } objects
 */

// batchGet
/**
 * Get multiple files by path in a single operation.
 * @param paths Array of absolute paths
 * @returns Record mapping each path to its content, or null if not found
 */

// batchSet
/**
 * Write multiple files in a single operation.
 * @param entries Record mapping absolute paths to content strings
 */

// stat
/**
 * Get file metadata.
 * @param path Absolute path starting with /
 * @returns Object with size, mtime, isDirectory, or null if not found
 */
```

## Backend-Specific Notes

- **MemoryStorage**: No `stat()` method — only document 8 methods
- **LocalStorageBackend**: No `stat()` method — only document 8 methods
- **AgenticStoreBackend.stat()**: Uses `\x00mtime` key suffix convention
- **OPFSBackend**: Uses OPFS API (`navigator.storage.getDirectory()`)
- **NodeFsBackend**: Uses `fs/promises`, supports symlinks
- **SQLiteBackend**: Uses SQL queries

Backend JSDoc should add a brief implementation note where behavior differs from the interface default (e.g., "Uses OPFS API" on OPFSBackend.get).

## Edge Cases to Document

- `delete()`: No-op on missing paths (no throw)
- `stat()`: Returns null for missing paths
- `scan()`: Returns empty array if no matches
- `batchGet()`: Missing paths return null in the record
- `list(prefix?)`: No prefix returns all paths
- `list()`: Paths always start with `/`

## Verification

- `npm run build` succeeds
- `npm test` passes (483/483)
- Spot-check: `grep -r '/\*\*' src/backends/` shows JSDoc blocks on all public methods
