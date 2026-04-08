# Design: Automatic Backend Selection

## Status
`createDefaultBackend()` is already implemented and exported from `src/index.ts`.
This task requires test coverage only — no source changes needed.

## File to Create
- `test/create-default-backend.test.ts`

## Logic (already in src/index.ts)
1. `process.versions?.node` truthy → `NodeFsBackend(rootDir ?? cwd())`
2. `navigator.storage.getDirectory()` succeeds → `OPFSBackend`
3. `typeof indexedDB !== 'undefined'` → `AgenticStoreBackend` over inline IDBStore
4. fallback → `MemoryStorage`

## Test Cases
```ts
describe('createDefaultBackend()', () => {
  it('returns NodeFsBackend in Node.js environment')
  it('returns OPFSBackend when navigator.storage.getDirectory resolves')
  it('returns AgenticStoreBackend when OPFS unavailable but indexedDB present')
  it('returns MemoryStorage when no storage APIs available')
  it('accepts rootDir option passed to NodeFsBackend')
})
```

## Edge Cases
- OPFS available but `getDirectory()` throws → fall through to IndexedDB branch
- `rootDir` option only applies to NodeFsBackend path

## Dependencies
- Mock `process`, `navigator`, `indexedDB` globals per test case
