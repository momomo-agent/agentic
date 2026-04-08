# Design: Expand edge-case tests to all backends

## File to modify
- `test/edge-cases.test.js` — extend existing file to cover Memory and LocalStorage backends

## Approach
The existing `edge-cases.test.js` only creates backends for `NodeFsBackend` and `AgenticStoreBackend`. Extend `makeBackends()` to also return `MemoryStorage` and `LocalStorageBackend` instances. The existing test loop already runs all cases for each backend, so no new test cases need to be written — just add the two missing backends.

## Changes

### `makeBackends()` — add MemoryStorage and LocalStorageBackend

```js
import { NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend } from '../dist/index.js'

function makeMockLocalStorage() {
  const store = new Map()
  return {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: k => store.delete(k),
    get length() { return store.size },
    key: i => Array.from(store.keys())[i] ?? null,
    clear: () => store.clear()
  }
}

function makeBackends() {
  const dir = mkdtempSync(join(tmpdir(), 'afs-edge-'))
  global.localStorage = makeMockLocalStorage()
  return [
    { name: 'NodeFsBackend',       backend: new NodeFsBackend(dir),                    cleanup: () => rmSync(dir, { recursive: true }) },
    { name: 'AgenticStoreBackend', backend: new AgenticStoreBackend(makeMemStore()),    cleanup: () => {} },
    { name: 'MemoryStorage',       backend: new MemoryStorage(),                        cleanup: () => {} },
    { name: 'LocalStorageBackend', backend: new LocalStorageBackend(),                  cleanup: () => {} },
  ]
}
```

### Add empty-path edge case test (new test in the loop)

```js
test(`${name}: empty path rejected`, async () => {
  await assert.rejects(() => backend.set('', 'v'))
})
```

### Concurrent writes — 10+ files (new test in the loop)

```js
test(`${name}: concurrent writes 10+ files`, async () => {
  await Promise.all(
    Array.from({ length: 10 }, (_, i) => backend.set(`/concurrent-${i}`, `v${i}`))
  )
  for (let i = 0; i < 10; i++) {
    assert.equal(await backend.get(`/concurrent-${i}`), `v${i}`)
  }
})
```

## Edge cases
- `LocalStorageBackend` requires `global.localStorage` to be set before instantiation — mock it in `makeBackends()` before `new LocalStorageBackend()`
- Empty path behavior: if backends don't currently throw on `""`, this test will fail and expose the gap — that is intentional per DBB-003

## Dependencies
- `dist/index.js` must export `MemoryStorage` and `LocalStorageBackend` (already does per `src/index.ts`)

## Test cases to verify (DBB)
- DBB-001: all 4 backends pass existing edge-case tests
- DBB-002: concurrent write test uses 10 files
- DBB-003: empty path rejected on all backends
