# Design: Implement createAutoBackend() Export

## Current State
`createBackend()` in `src/index.ts` already implements full auto-selection:
- Node.js → NodeFsBackend
- Browser + OPFS → OPFSBackend  
- Browser + IndexedDB → AgenticStoreBackend
- Fallback → MemoryStorage

`createDefaultBackend` is already exported as an alias.

## Action Required
Add `createAutoBackend` as a named export alias in `src/index.ts`:

```ts
export const createAutoBackend = createBackend
```

## Files to Modify

### `src/index.ts`
- Add one line after the existing `createDefaultBackend` alias:
  ```ts
  export const createAutoBackend = createBackend
  ```

## Test Cases
- `createAutoBackend()` resolves to a `StorageBackend` instance
- In Node.js environment: returns `NodeFsBackend`
