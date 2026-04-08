# Design: Edge case tests — empty paths and cross-backend consistency

## Files to Modify
- `test/edge-cases.test.js` — add empty path rejection tests
- `test/cross-backend.test.js` — already covers consistency; verify empty path test present

## Empty Path Tests
Add to the per-backend loop in `test/edge-cases.test.js`:

```js
test(`${name}: set empty path rejects`, async () => {
  await assert.rejects(() => backend.set('', 'v'))
})

test(`${name}: get empty path rejects or returns null`, async () => {
  // backends may reject or return null — either is acceptable
  const result = await backend.get('').catch(() => null)
  assert.equal(result, null)
})
```

## Cross-backend Consistency
`test/cross-backend.test.js` already runs identical set/get/delete/list/scan tests across all 5 backends. No new file needed — verify the existing tests cover the DBB.

If any backend is missing from `makeBackends()`, add it.

## Edge Cases to Cover
1. `set('', 'v')` → rejects (all backends)
2. `get('')` → rejects or null (all backends)
3. Special chars in path (already in edge-cases.test.js)
4. Unicode path (already in edge-cases.test.js)
5. Overwrite (already in edge-cases.test.js)

## Dependencies
- `dist/index.js` must export all backends
- MockSQLiteDb helper already defined in edge-cases.test.js
