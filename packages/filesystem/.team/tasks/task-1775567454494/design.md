# Task Design: Add cross-backend and edge-case test suites

## Objective
Expand test/cross-backend.test.js and test/edge-cases.test.js to cover all 6 backends (NodeFs, AgenticStore, Memory, LocalStorage, OPFS, SQLite).

## Files to Modify

### 1. test/cross-backend.test.js
**Current state:** Only tests NodeFsBackend and AgenticStoreBackend (lines 19-25)

**Changes:**
1. Import additional backends:
   ```javascript
   import { NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend, OPFSBackend, SQLiteBackend } from '../dist/index.js'
   ```

2. Add mock localStorage helper (copy from edge-cases.test.js lines 19-29):
   ```javascript
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
   ```

3. Update `makeBackends()` function to return all 6 backends:
   ```javascript
   function makeBackends() {
     const dir = mkdtempSync(join(tmpdir(), 'afs-cross-'))
     global.localStorage = makeMockLocalStorage()

     // For SQLite: use in-memory database
     const Database = require('better-sqlite3')
     const db = new Database(':memory:')

     return [
       { name: 'NodeFsBackend', backend: new NodeFsBackend(dir), cleanup: () => rmSync(dir, { recursive: true }) },
       { name: 'AgenticStoreBackend', backend: new AgenticStoreBackend(makeMemStore()), cleanup: () => {} },
       { name: 'MemoryStorage', backend: new MemoryStorage(), cleanup: () => {} },
       { name: 'LocalStorageBackend', backend: new LocalStorageBackend(), cleanup: () => {} },
       // OPFS: skip in Node.js environment (requires browser)
       // { name: 'OPFSBackend', backend: new OPFSBackend(), cleanup: () => {} },
       { name: 'SQLiteBackend', backend: new SQLiteBackend(db), cleanup: () => db.close() },
     ]
   }
   ```

4. Add conditional OPFS test (only in browser environment):
   ```javascript
   // After the main loop, add:
   if (typeof navigator !== 'undefined' && navigator.storage?.getDirectory) {
     test('OPFSBackend: get/set', async () => {
       const root = await navigator.storage.getDirectory()
       const backend = new OPFSBackend(root)
       await backend.set('/a', 'hello')
       assert.equal(await backend.get('/a'), 'hello')
     })
     // ... repeat other tests for OPFS
   }
   ```

**Test cases (already exist, will run for all backends):**
- get/set (line 28-31)
- get missing returns null (line 33-35)
- delete (line 37-41)
- delete missing resolves without error (line 43-45)
- list includes set paths (line 47-53)
- list with prefix (line 55-61)
- scan match (line 63-67)
- scan no match (line 69-72)

### 2. test/edge-cases.test.js
**Current state:** Tests 4 backends (NodeFs, AgenticStore, Memory, LocalStorage) - lines 31-40

**Changes:**
1. Import SQLiteBackend:
   ```javascript
   import { NodeFsBackend, AgenticStoreBackend, MemoryStorage, LocalStorageBackend, SQLiteBackend } from '../dist/index.js'
   ```

2. Update `makeBackends()` to include SQLiteBackend:
   ```javascript
   function makeBackends() {
     const dir = mkdtempSync(join(tmpdir(), 'afs-edge-'))
     global.localStorage = makeMockLocalStorage()

     const Database = require('better-sqlite3')
     const db = new Database(':memory:')

     return [
       { name: 'NodeFsBackend', backend: new NodeFsBackend(dir), cleanup: () => rmSync(dir, { recursive: true }) },
       { name: 'AgenticStoreBackend', backend: new AgenticStoreBackend(makeMemStore()), cleanup: () => {} },
       { name: 'MemoryStorage', backend: new MemoryStorage(), cleanup: () => {} },
       { name: 'LocalStorageBackend', backend: new LocalStorageBackend(), cleanup: () => {} },
       { name: 'SQLiteBackend', backend: new SQLiteBackend(db), cleanup: () => db.close() },
     ]
   }
   ```

3. Add conditional OPFS tests (same approach as cross-backend.test.js)

**Test cases (already exist, will run for all backends):**
- Special characters in filename (line 43-46)
- Unicode filename (line 48-51)
- Newline in content (line 53-56)
- Overwrite (line 58-62)
- Concurrent writes same key (line 64-68)
- Concurrent independent writes (line 70-74)
- Scan multiline (line 76-80)
- List after delete (line 82-87)
- Empty path rejected (line 89-91)
- Concurrent writes 10+ files (line 93-101)

## Dependencies
- better-sqlite3 package (peer dependency, should already be installed)
- OPFSBackend tests will be skipped in Node.js environment

## Error Handling
- SQLiteBackend: wrap in try-catch, skip tests if better-sqlite3 not available
- OPFSBackend: skip tests if not in browser environment
- All backends: ensure cleanup() is called even if tests fail

## Test Verification
Run `npm test` and verify:
1. cross-backend.test.js shows 5-6 backend names in output (5 in Node.js, 6 in browser)
2. edge-cases.test.js shows 5-6 backend names in output
3. All tests pass (exit code 0)
4. Total test count increases by ~20-30 tests

## Edge Cases
- SQLiteBackend may not be available if better-sqlite3 is not installed → skip gracefully
- OPFSBackend only works in browser → skip in Node.js
- Concurrent writes may have timing issues → use Promise.all() for deterministic behavior
