# Fix AgenticStoreBackend instantiation in createBackend()

## Progress

### Completed
- Added inline IDBStore class inside the `indexedDB` branch of createBackend()
- IDBStore implements the AgenticStore interface with all required methods:
  - get(key: string)
  - set(key: string, value: any)
  - delete(key: string)
  - keys(): Promise<string[]>
  - has(key: string)
- Updated line 40 to pass `new IDBStore()` to AgenticStoreBackend constructor
- Verified TypeScript build passes with no errors

### Implementation Details
- IDBStore uses IndexedDB with database name 'agentic-fs' and object store 'kv'
- Properly scoped inside the `indexedDB` branch so it only runs in browser environments
- Uses promise-based wrappers for IDB operations
- Build output: ✅ ESM build success, ✅ DTS build success

### Result
Task complete. The TypeScript compilation error is fixed and createBackend() now correctly instantiates AgenticStoreBackend with a valid store parameter.
