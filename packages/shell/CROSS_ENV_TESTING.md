# Cross-Environment Testing Strategy

## Overview
Agentic Shell runs in browser, Electron, and Node.js. All environment
differences are abstracted by the AgenticFileSystem interface. This document
defines how to verify cross-environment consistency.

## Test Matrix

| Feature Category     | Node.js | Browser (in-memory) | Browser (IndexedDB) | Electron |
|---------------------|---------|---------------------|---------------------|----------|
| All commands         | native FS | MockFileSystem    | TBD                 | native FS |
| Pipe support         | native FS | MockFileSystem    | TBD                 | native FS |
| Redirection          | native FS | MockFileSystem    | TBD                 | native FS |
| Glob expansion       | native FS | MockFileSystem    | TBD                 | native FS |
| Streaming grep       | native FS | readStream mock   | TBD                 | native FS |
| Pagination           | native FS | MockFileSystem    | TBD                 | native FS |
| Background jobs      | native FS | MockFileSystem    | TBD                 | native FS |
| Env var substitution | N/A      | N/A                | N/A                 | N/A      |

## Mock Strategies

### Node.js
- Use native filesystem via `AgenticFileSystem` implementation
- Test suite: `src/index.test.ts` (Vitest)
- Full command coverage

### Browser (in-memory)
- Use `MockFileSystem` from test suite (Map-based in-memory FS)
- Run same test suite with browser-compatible test runner (Vitest with jsdom/happy-dom)
- Covers all commands except platform-specific edge cases

### Browser (IndexedDB)
- Use IndexedDB-backed `AgenticFileSystem` implementation
- Subset of tests focused on persistence and large file handling
- Higher latency — verify performance thresholds still met

### Electron
- Use native FS via Electron APIs
- Same test suite as Node.js
- Verify IPC boundaries don't affect command behavior

## DBB-env Coverage

### DBB-env-001: Cross-environment consistency
- Run full test suite in each environment
- All tests must pass in all three environments
- AgenticFileSystem interface must abstract all differences

### DBB-env-002: Path resolution consistency
- Path resolution tests (`.`, `..`, `/`) run identically across environments
- No environment-specific path handling

### DBB-env-003: Error format consistency
- Error-triggering commands produce identical error messages across environments
- Format: `<command>: <path>: <reason>`

## CI Integration

### Current State
- Tests run via Vitest in Node.js environment
- No automated cross-env CI pipeline

### Recommended Approach
1. **Phase 1**: Ensure MockFileSystem tests pass (already done)
2. **Phase 2**: Add browser test runner (Vitest + jsdom or Playwright)
3. **Phase 3**: Add Electron test runner (electron-mocha or Playwright + Electron)
4. **Phase 4**: CI matrix job running all three environments

### CI Matrix (Future)
```yaml
test:
  matrix:
    - env: node
      runner: vitest
    - env: browser
      runner: vitest --environment jsdom
    - env: electron
      runner: playwright + electron
```

## Priority Order
1. Node.js (current — fully covered)
2. Browser with MockFileSystem (high value — validates interface abstraction)
3. Electron (medium value — mostly passes if Node.js passes)
4. Browser with IndexedDB (lower value — persistence-specific edge cases)
