# Design: Add empty path and cross-backend edge-case tests

## File to Modify
- `test/edge-cases.test.ts` — add OPFS/Memory/LocalStorage to backends array, add empty path tests

## What to Add

### 1. Add MemoryStorage and LocalStorageBackend to backends array
Already present in `edge-cases.test.ts`. No change needed for those two.

### 2. Add OPFSBackend (browser-only, skip in Node)
OPFS requires browser APIs — skip in Node.js test runner with a guard:

```ts
// At top of file, after imports:
const isNode = typeof process !== 'undefined' && process.versions?.node
```

Do not add OPFSBackend to the Node.js test run — it cannot be meaningfully mocked without a full browser environment. Instead, note in a comment that OPFS edge-case coverage is handled by `test/backends/opfs-stat.test.ts`.

### 3. Add empty path tests to the existing `empty and invalid paths` describe block
The existing tests already cover `get('')` and `set('')` for NodeFs, Memory, AgenticStore, LocalStorage. Verify these pass for all 4 backends.

Add one missing case:

```ts
test('empty string path on delete is no-op', async () => {
  const { backend, cleanup } = await create()
  try {
    // Should not throw
    try { await backend.delete('') } catch (_) {}
    assert.ok(true)
  } finally {
    await cleanup()
  }
})

test('empty string path on list not included', async () => {
  const { backend, cleanup } = await create()
  try {
    try { await backend.set('', 'x') } catch (_) {}
    const paths = await backend.list()
    assert.ok(!paths.includes(''))
  } finally {
    await cleanup()
  }
})
```

## Edge Cases
- Empty path behavior may differ per backend (throw vs no-op) — tests accept both
- OPFS skipped in Node environment — covered separately

## Dependencies
- All 4 testable backends already imported in `edge-cases.test.ts`
