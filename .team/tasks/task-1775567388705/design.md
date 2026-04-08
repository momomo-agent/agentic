# Design: Fix AgenticStoreBackend instantiation in createBackend()

## Problem
`src/index.ts` calls `new AgenticStoreBackend()` with no arguments, but the constructor requires `store: AgenticStore`. This causes a TypeScript compile error.

## File to Modify
- `src/index.ts`

## Solution
Create a minimal inline IndexedDB store class implementing the `AgenticStore` interface, then pass it to `AgenticStoreBackend`.

## Implementation

### Inline IDB store (inside the `indexedDB` branch of createBackend())

```ts
class IDBStore implements AgenticStore {
  private dbp: Promise<IDBDatabase>
  constructor() {
    this.dbp = new Promise((res, rej) => {
      const req = indexedDB.open('agentic-fs', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('kv')
      req.onsuccess = () => res(req.result)
      req.onerror = () => rej(req.error)
    })
  }
  private tx(mode: IDBTransactionMode) {
    return this.dbp.then(db => db.transaction('kv', mode).objectStore('kv'))
  }
  private wrap<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error) })
  }
  async get(key: string) { return this.wrap((await this.tx('readonly')).get(key)) }
  async set(key: string, value: any) { await this.wrap((await this.tx('readwrite')).put(value, key)) }
  async delete(key: string) { await this.wrap((await this.tx('readwrite')).delete(key)) }
  async keys(): Promise<string[]> { return this.wrap((await this.tx('readonly')).getAllKeys()) as Promise<string[]> }
  async has(key: string) { return (await this.get(key)) != null }
}
```

Then change:
```ts
// Before (broken):
return new AgenticStoreBackend()

// After:
return new AgenticStoreBackend(new IDBStore())
```

## Edge Cases
- `IDBStore` must be defined inside the `indexedDB` branch so it only runs in browser environments where `indexedDB` is defined
- The `AgenticStore` interface is defined in `src/backends/agentic-store.ts` — import or inline the type

## Test Cases
- `npm run build` exits 0 with no TS errors
- In browser without OPFS: `createBackend()` returns an `AgenticStoreBackend` instance
- Write + read roundtrip via returned backend succeeds
