# M5 DBB: File Metadata, Concurrency Tests & Polish

## Definition of Done

### 1. File Metadata Implementation
- [ ] NodeFsBackend.stat() returns accurate size and mtime for all files
- [ ] OPFSBackend.stat() implemented using FileSystemFileHandle.getFile()
- [ ] AgenticFileSystem.ls() populates size/mtime in LsResult when stat() available
- [ ] AgenticFileSystem.tree() populates size/mtime in TreeNode when stat() available
- [ ] stat() returns null for missing files without throwing errors

### 2. AgenticStoreBackend Normalization
- [ ] AgenticStoreBackend.list() returns all paths with '/' prefix
- [ ] AgenticStoreBackend.scan() returns {path, line, content}[] with normalized paths
- [ ] AgenticStoreBackend.scanStream() yields normalized paths
- [ ] Consistency test passes: all backends return identical path formats

### 3. Concurrent and Edge-Case Tests
- [ ] Concurrent write tests: 10+ parallel writes to different files succeed
- [ ] Race condition tests: concurrent writes to same file don't corrupt data
- [ ] Empty path tests: empty string paths handled gracefully (error or reject)
- [ ] Special character tests: paths with spaces, unicode, dots work correctly
- [ ] Tests run against all backends: NodeFs, OPFS, AgenticStore, Memory, LocalStorage
- [ ] All edge-case tests pass with 100% success rate

### 4. Performance Documentation
- [ ] README includes performance comparison table with:
  - Read speed (ops/sec) for small files (<10KB)
  - Write speed (ops/sec) for small files
  - Read speed for large files (>1MB)
  - Storage limits per backend
  - Browser support matrix
  - Recommended use cases per backend
- [ ] Table includes all backends: IndexedDB (AgenticStore), OPFS, Node fs, Memory, LocalStorage

## Verification Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- test/backends/node-fs.test.ts
npm test -- test/backends/opfs.test.ts
npm test -- test/backends/agentic-store.test.ts
npm test -- test/edge-cases.test.ts
npm test -- test/concurrent.test.ts

# Verify stat() implementation
npm test -- test/filesystem-metadata.test.ts

# Check README has performance table
grep -A 20 "Performance Comparison" README.md
```

## Success Criteria
- All tests pass with 0 failures
- Code coverage ≥ 90% for modified files
- README performance table is complete and accurate
- No regressions in existing functionality
