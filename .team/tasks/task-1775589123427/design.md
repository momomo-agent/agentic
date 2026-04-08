# Task Design: Add SQLiteBackend to createBackend() auto-selection

## Summary

Integrate SQLiteBackend into the `createBackend()` auto-selection chain so that when `better-sqlite3` is available in Node.js, SQLite is preferred over the plain filesystem backend for persistent storage.

## Files to Modify

- `src/index.ts` — add SQLite auto-detection in `createBackend()`

## Current createBackend() Flow (src/index.ts:26-77)

```
1. options?.sqliteDb → SQLiteBackend (explicit, already works)
2. process.versions.node → NodeFsBackend
3. navigator.storage.getDirectory() → OPFSBackend
4. indexedDB → AgenticStoreBackend (IDB store)
5. fallback → MemoryStorage
```

## Implementation

### Step 1: Add SQLite auto-detection in Node.js branch

After the explicit `options?.sqliteDb` check (line 27-30) but before the `NodeFsBackend` fallback (line 33-35), add:

```ts
// Auto-detect better-sqlite3 in Node.js
if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    const Database = (await import('better-sqlite3')).default
    const { join } = await import('node:path')
    const dbPath = options?.sqlitePath ?? join(process.cwd(), '.agentic-fs.db')
    const { SQLiteBackend } = await import('./backends/sqlite.js')
    return new SQLiteBackend(new Database(dbPath))
  } catch {
    // better-sqlite3 not available, fall through to NodeFsBackend
  }
  const { NodeFsBackend } = await import('./backends/node-fs.js')
  return new NodeFsBackend(options?.rootDir ?? process.cwd())
}
```

### Step 2: Update options type

The `options` parameter type `{ rootDir?: string; sqliteDb?: unknown }` should be extended:

```ts
export async function createBackend(options?: {
  rootDir?: string
  sqliteDb?: unknown
  sqlitePath?: string
}): Promise<StorageBackend>
```

### Step 3: Update detection order documentation

Update the JSDoc on `createBackend()` to document:
1. Explicit `sqliteDb` option → SQLiteBackend
2. Node.js with `better-sqlite3` installed → SQLiteBackend with auto-created DB
3. Node.js without `better-sqlite3` → NodeFsBackend
4. Browser with OPFS → OPFSBackend
5. Browser with IndexedDB → AgenticStoreBackend (IDB)
6. Fallback → MemoryStorage

### Edge Cases
- `better-sqlite3` import failure (not installed) → catch and fall through
- DB file path creation: SQLiteBackend's constructor runs `CREATE TABLE IF NOT EXISTS`, and `better-sqlite3` creates the file automatically
- `options.sqliteDb` takes precedence over auto-detection (already handled by the first check)
- `options.sqlitePath` is only used when auto-detecting; explicit `sqliteDb` ignores it

### Test Verification
```bash
node --test test/create-backend-sqlite.test.js
node --test test/create-backend.test.js
```

## Dependencies
- `better-sqlite3` is a peer dependency — optional, auto-detected
- No changes to SQLiteBackend class itself
