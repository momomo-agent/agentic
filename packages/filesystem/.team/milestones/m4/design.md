# M4 Technical Design: Streaming, SQLite & Test Coverage

## Overview
Four independent deliverables: streaming scan() API, SQLite backend adapter, symlink support in NodeFsBackend, and comprehensive test coverage for M3 features.

## New Files
- `src/backends/sqlite.ts` — SQLite adapter for Node.js and browser
- `test/backends/local-storage.test.ts` — LocalStorageBackend tests
- `test/backends/tfidf-embed.test.ts` — TfIdfEmbedBackend tests
- `test/filesystem-tree.test.ts` — tree() API tests
- `test/filesystem-permissions.test.ts` — permissions system tests
- `test/backends/sqlite.test.ts` — SQLiteBackend tests
- `test/streaming-scan.test.ts` — streaming scan() tests
- `test/symlinks.test.ts` — symlink support tests

## Modified Files
- `src/types.ts` — add `scanStream()` to StorageBackend interface
- `src/backends/node-fs.ts` — add `scanStream()` and symlink resolution
- `src/backends/opfs.ts` — add `scanStream()`
- `src/backends/agentic-store.ts` — add `scanStream()`
- `src/backends/memory.ts` — add `scanStream()`
- `src/backends/local-storage.ts` — add `scanStream()`
- `src/index.ts` — export SQLiteBackend
- `README.md` — add SQLite example, streaming docs, symlink docs, performance table update

## Key Design Decisions

### Streaming scan()
- Add `scanStream(pattern: string): AsyncIterable<{path, line, content}>` to StorageBackend interface
- Keep original `scan()` for backward compatibility, implemented as wrapper around `scanStream()`
- Implementation pattern:
  ```typescript
  async *scanStream(pattern: string) {
    const paths = await this.list()
    for (const path of paths) {
      const content = await this.get(path)
      if (!content) continue
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(pattern)) {
          yield { path, line: i + 1, content: lines[i] }
        }
      }
    }
  }
  ```
- For NodeFsBackend, use `fs.createReadStream()` with line-by-line processing to avoid loading entire file
- Memory-efficient: processes one line at a time, yields immediately on match

### SQLite Backend
- Single table schema: `CREATE TABLE files (path TEXT PRIMARY KEY, content TEXT, size INTEGER, mtime INTEGER)`
- Constructor accepts either:
  - Node.js: `Database` instance from `better-sqlite3`
  - Browser: `Database` instance from `sql.js`
- Auto-detect environment and provide helper factory: `createSQLiteBackend(dbPath?: string)`
- `list(prefix?)` uses `SELECT path FROM files WHERE path LIKE ?` with prefix pattern
- `scan(pattern)` uses `SELECT path, content FROM files` then splits/filters in JS (SQLite LIKE is not line-aware)
- `scanStream(pattern)` yields results row-by-row using prepared statement iteration
- `batchGet`/`batchSet` use transactions for atomicity
- Path normalization: ensure `/` prefix on all stored paths

### Symlink Support
- NodeFsBackend `walk()` method updated to use `fs.lstat()` to detect symlinks
- If symlink detected, use `fs.readlink()` to get target, then `fs.stat()` to check if target exists
- Track visited paths in a Set to detect circular symlinks (throw error if detected)
- `get()` uses `fs.readFile()` which already follows symlinks automatically
- `scan()` and `scanStream()` inherit symlink behavior from `list()` which uses updated `walk()`
- Broken symlinks are silently skipped (same as permission errors)

### M3 Test Coverage
- LocalStorageBackend tests: use jsdom to mock `window.localStorage`, run same test suite as other backends
- TfIdfEmbedBackend tests: verify `encode()` returns consistent vectors, `search()` returns ranked results, `index()` processes all files
- tree() API tests: verify nested structure, empty directories, single file, root-level files
- Permissions tests: verify read/write/execute enforcement, longest-prefix matching, default allow behavior
- All tests use vitest framework matching existing test structure

## Dependencies
- `better-sqlite3` (optional peer dependency for Node.js)
- `sql.js` (optional peer dependency for browser)
- `jsdom` (dev dependency for localStorage tests)

## Error Handling
- SQLiteBackend: wrap all SQL operations in try-catch, return null for NotFoundError, throw IOError for SQL errors
- Symlink circular detection: throw IOError with message "Circular symlink detected: {path}"
- Streaming scan: errors during iteration should be caught and logged, not crash the stream

## Performance Considerations
- `scanStream()` is memory-efficient but may be slower than `scan()` for small files due to async overhead
- SQLiteBackend `scan()` loads all file contents into memory; use `scanStream()` for large datasets
- Symlink resolution adds one extra stat call per symlink; acceptable overhead for correctness
