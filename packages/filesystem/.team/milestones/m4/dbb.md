# M4 Done-By-Definition (DBB)

## Streaming scan()
- [ ] `StorageBackend` interface updated with `scanStream(pattern: string): AsyncIterable<{path: string; line: number; content: string}>`
- [ ] All backends implement `scanStream()`: NodeFsBackend, OPFSBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend
- [ ] Original `scan()` method remains for backward compatibility, implemented as `Array.from(await scanStream())`
- [ ] `scanStream()` yields results incrementally without loading entire file into memory
- [ ] Test verifies streaming behavior with large files (>10MB)

## SQLite Backend
- [ ] `SQLiteBackend` class exported from `src/backends/sqlite.ts`
- [ ] Implements all `StorageBackend` methods: `get`, `set`, `delete`, `list`, `scan`, `scanStream`, `batchGet`, `batchSet`
- [ ] Works in both Node.js (better-sqlite3) and browser (sql.js) environments
- [ ] Schema: single table `files(path TEXT PRIMARY KEY, content TEXT, size INTEGER, mtime INTEGER)`
- [ ] All paths stored with `/` prefix
- [ ] Passes the shared backend test suite (same tests as other backends)
- [ ] Exported from `src/index.ts`

## Symlink Support
- [ ] NodeFsBackend `list()` resolves symlinks and includes target files
- [ ] NodeFsBackend `get()` follows symlinks to read target content
- [ ] NodeFsBackend `scan()` and `scanStream()` follow symlinks
- [ ] Circular symlink detection prevents infinite loops
- [ ] Test coverage for symlink scenarios: file symlinks, directory symlinks, broken symlinks, circular symlinks

## M3 Test Coverage
- [ ] LocalStorageBackend test suite in `test/backends/local-storage.test.ts`
- [ ] TfIdfEmbedBackend test suite in `test/backends/tfidf-embed.test.ts`
- [ ] `tree()` API test suite in `test/filesystem-tree.test.ts`
- [ ] Permissions system test suite in `test/filesystem-permissions.test.ts`
- [ ] All tests pass with 100% coverage for new M3 features

## Documentation
- [ ] JSDoc complete on all public APIs (AgenticFileSystem, StorageBackend, all backends)
- [ ] README updated with SQLite backend example
- [ ] README performance table includes SQLiteBackend benchmarks
- [ ] README includes streaming scan() example
- [ ] README includes symlink behavior documentation
- [ ] CHANGELOG.md updated with M4 features
