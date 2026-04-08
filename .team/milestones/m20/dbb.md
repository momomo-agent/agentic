# Milestone 20 — Done-By-Definition (DBB)

## DBB-001: README with usage examples and per-backend configuration docs

- `README.md` exists at project root (`/README.md`)
- Quick start section shows `createBackend()` auto-selection example
- Usage examples for all 6 backends: `NodeFsBackend`, `OPFSBackend`, `AgenticStoreBackend`, `MemoryStorage`, `LocalStorageBackend`, `SQLiteBackend`
- Each backend example shows constructor/import and configuration options
- Performance comparison table present with columns: Backend, Read (small), Write (small), Read (large), Storage Limit, Browser Support, Best For
- Browser support matrix table present
- Storage limits table present
- `StorageBackend` interface documented with all required methods
- Custom backend implementation example included
- Streaming scan example included
- Agent tool integration example included
- No source code changes — documentation only

## DBB-002: Edge case tests

- File `test/edge-cases.test.js` exists (or a new file like `test/edge-cases-new.test.js`)
- Empty path test: `set('', 'v')` throws `IOError` across all 5 Node.js-testable backends (NodeFs, AgenticStore, Memory, LocalStorage, SQLite)
- Empty path test: `get('')` rejects or returns `null` across all backends
- Empty path test: `delete('')` rejects or succeeds silently across all backends
- Empty path test: `list('')` rejects or succeeds across all backends
- Special character filenames: spaces (`'/file with spaces'`)
- Special character filenames: unicode (`'/日本語.txt'`)
- Special character filenames: dots (`'/.hidden'`, `'/file.with.dots'`)
- Concurrent write safety: two simultaneous `set()` to the same path — one value wins, no corruption
- Concurrent write safety: 10+ simultaneous `set()` to different paths — all succeed
- All tests use the same `makeBackends()` factory pattern as existing `test/edge-cases.test.js`
- All 5 Node.js-testable backends covered in each test
- All tests pass

## DBB-003: Verify AgenticStoreBackend scan() streaming

- Test file `test/scan-streaming-verify.test.js` exists
- Lazy evaluation test: `scanStream()` on 3 files breaks after first match — confirms only 1 `store.get()` call
- Memory comparison test: generate >1MB content, measure heap before/after `scanStream()` — heap increase should be <2x the match size (not the full file size)
- `scan()` still delegates to `scanStream()` (regression check)
- Meta keys (`\x00mtime`) are filtered from scan results
- Document findings: confirm streaming is per-key lazy iteration (acceptable for in-memory key-value stores)
- All tests pass

## DBB-004: Verify OPFSBackend scan() streaming

- OPFS `scanStream()` uses `file.stream()` + `TextDecoderStream` + `pipeThrough` (already implemented in opfs.ts)
- Chunk-based line splitting: test confirms scanStream handles chunk boundaries correctly (pattern split across chunk boundary)
- Large file streaming: test with file >1MB confirms scanStream does not load entire file into memory
- Memory comparison: heap increase during scanStream of large file is bounded (not proportional to file size)
- OPFSBackend excluded from Node.js test suite — documented as browser-only
- Browser verification test stub created for manual/CI browser testing
- Document findings: confirm true streaming via File.stream() API
- All Node.js tests pass

## Verification Matrix

| Criterion | Test File | Passes? |
|-----------|-----------|---------|
| README exists with all sections | — | manual |
| Edge cases: empty path | test/edge-cases.test.js | auto |
| Edge cases: special chars | test/edge-cases.test.js | auto |
| Edge cases: concurrent writes | test/edge-cases.test.js | auto |
| AgenticStore scan streaming | test/scan-streaming-verify.test.js | auto |
| OPFS scan streaming | test/opfs-scan-streaming-verify.test.js | auto |
