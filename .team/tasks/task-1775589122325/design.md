# Task Design: Add JSDoc to all backend class methods

## Summary

Two-part task: (1) Add class-level JSDoc with `@example` to 5 backend classes that lack it, and (2) extend the test suite to enforce JSDoc completeness as a gate for all 6 backend classes.

## Files to Modify

- `src/backends/agentic-store.ts` — add class-level JSDoc
- `src/backends/opfs.ts` — add class-level JSDoc
- `src/backends/node-fs.ts` — add class-level JSDoc
- `src/backends/memory.ts` — add class-level JSDoc
- `src/backends/local-storage.ts` — add class-level JSDoc
- `test/jsdoc.test.js` — extend with backend class method + class-level JSDoc assertions

## Current State

**Method-level JSDoc:** All 6 backends already have JSDoc on every public method (`get`, `set`, `delete`, `list`, `scan`, `scanStream`, `batchGet`, `batchSet`, `stat`). No source changes needed for method-level.

**Class-level JSDoc:** Only `SQLiteBackend` has a class-level `/** */` comment. The other 5 (`AgenticStoreBackend`, `OPFSBackend`, `NodeFsBackend`, `MemoryStorage`, `LocalStorageBackend`) lack class-level documentation.

**Test coverage:** `test/jsdoc.test.js` (lines 1-27) checks JSDoc on `AgenticFileSystem` methods and `StorageBackend` interface methods — but NOT on any concrete backend class.

## Implementation

### Part 1: Add class-level JSDoc to 5 backends

Add a `/** */` block immediately before each `export class` declaration:

```ts
/**
 * In-memory Map-based storage backend. No persistence — useful for testing and ephemeral sessions.
 * @example
 * const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
 */
export class MemoryStorage implements StorageBackend {
```

Per-backend summaries:
- `AgenticStoreBackend`: "Key-value store backend wrapping any store with get/set/delete/keys/has. Works in browser and Node.js."
- `OPFSBackend`: "Browser Origin Private File System backend. ~10x faster than IndexedDB for large files. Chrome 86+, Safari 15.2+."
- `NodeFsBackend`: "Node.js filesystem backend with configurable root directory. Supports symlinks."
- `MemoryStorage`: "In-memory Map-based storage backend. No persistence. Useful for testing."
- `LocalStorageBackend`: "Browser localStorage adapter. Synchronous storage exposed via async interface."

### Part 2: Extend `test/jsdoc.test.js`

Add two test blocks:

**Block A — Class-level JSDoc:**
```js
for (const { name, file } of backendFiles) {
  test(`${name} has class-level JSDoc`, () => {
    const source = readFileSync(...)
    const classIdx = source.indexOf(`class ${name}`)
    if (classIdx === -1) return
    const before = source.slice(Math.max(0, classIdx - 300), classIdx)
    assert.ok(before.includes('/**'), `${name} must have class-level JSDoc`)
  })
}
```

**Block B — Method-level JSDoc:**
```js
const methods = ['get', 'set', 'delete', 'list', 'scan', 'scanStream', 'batchGet', 'batchSet', 'stat']
for (const { name, file } of backendFiles) {
  for (const method of methods) {
    test(`${name}.${method} has JSDoc`, () => {
      // find method, check 200 chars before for /**
    })
  }
}
```

### Edge Cases
- `stat()` is optional on `StorageBackend` — skip if method signature not found in source
- `scanStream` uses `async *` syntax — search for both `async *scanStream(` and `scanStream(`
- Class names in source may differ from export names (e.g., the class in `memory.ts` is `MemoryStorage`)

### Test Verification
```bash
node --test test/jsdoc.test.js
```

## Dependencies
- None — source changes are additive (class-level JSDoc), test-only otherwise
