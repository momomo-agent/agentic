# Design: Per-backend test suites for OPFS, Memory, and LocalStorage

## Files to Create
- `test/backends/memory.test.js`
- `test/backends/local-storage.test.js`
- `test/backends/opfs.test.js` (browser-only, skip in Node)

## Pattern (same for memory and local-storage)
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorage } from '../../dist/index.js'

// setup/teardown per test
test('set/get round-trip', async () => { ... })
test('get missing returns null', async () => { ... })
test('delete removes key', async () => { ... })
test('delete missing is no-op', async () => { ... })
test('list returns all paths with / prefix', async () => { ... })
test('list with prefix filters', async () => { ... })
test('scan returns {path, line, content}', async () => { ... })
test('scan no match returns []', async () => { ... })
```

## LocalStorageBackend setup
```js
function makeMockLocalStorage() {
  const store = new Map()
  return {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: k => store.delete(k),
    get length() { return store.size },
    key: i => Array.from(store.keys())[i] ?? null,
  }
}
// before each test: global.localStorage = makeMockLocalStorage()
```

## OPFSBackend
- File: `test/backends/opfs.test.js`
- Skip entirely in Node: `if (typeof globalThis.FileSystemDirectoryHandle === 'undefined') process.exit(0)`
- Same 8 test cases using `new OPFSBackend()`

## Edge Cases
- Each test uses a fresh backend instance (no shared state)
- scan: set multi-line content, assert line numbers

## Test Cases to Verify
1. set('/a','v') → get('/a') === 'v'
2. get('/missing') === null
3. set+delete → get === null
4. delete missing → no throw
5. list() includes set paths, all start with '/'
6. list('/prefix') filters correctly
7. scan('keyword') returns [{path, line, content}]
8. scan('nomatch') returns []
