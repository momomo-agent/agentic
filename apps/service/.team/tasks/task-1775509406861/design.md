# Design: store.delete() 别名修复

## Analysis
`src/store/index.js` already exports `del` as `delete` via:
```js
export { del as delete };
```
The named export `delete` is available. DBB tests importing `{ delete: deleteFn }` from the store module will work.

## Files to Modify
None — the alias already exists.

## Verification
- `import { delete: storeDelete } from '../store/index.js'` resolves correctly
- `await storeDelete('key')` calls `del('key')` → `store.delete(key)` on the underlying agentic-store
- Deleting a non-existent key: agentic-store's `delete()` is a no-op, no exception thrown

## Test Cases (DBB-001, DBB-002)
```js
await set('k', 'v');
await storeDelete('k');
assert(await get('k') === null);          // DBB-001

await storeDelete('nonexistent');         // DBB-002 — must not throw
```

## Notes
If the tester imports `store` as a namespace (`import * as store`) and calls `store.delete(key)`, this also works because `delete` is a named export (not a reserved word issue in ES module namespace objects).
