# Task Design: SQLiteBackend in createBackend() Auto-Selection

**Task ID:** task-1775585021613
**Priority:** P1
**Milestone:** m17

## Files to Modify
- `src/index.ts` — update `createBackend()` function and its options type

## Current Auto-Selection Chain (`src/index.ts` lines 26-69)

```
Node.js → NodeFsBackend
Browser + OPFS → OPFSBackend
Browser + IndexedDB → AgenticStoreBackend (IDBStore)
Fallback → MemoryStorage
```

## Changes Required

### 1. Update `createBackend` signature

```ts
export async function createBackend(options?: {
  rootDir?: string
  sqliteDb?: unknown        // ← NEW: explicit SQLite database instance
}): Promise<import('./types.js').StorageBackend>
```

### 2. Update auto-selection chain

Add SQLite as an explicit option before the auto-detection chain, and as an auto-detected fallback after NodeFs:

```ts
export async function createBackend(options?: {
  rootDir?: string
  sqliteDb?: unknown
}): Promise<import('./types.js').StorageBackend> {
  // Explicit SQLite selection
  if (options?.sqliteDb) {
    const { SQLiteBackend } = await import('./backends/sqlite.js')
    return new SQLiteBackend(options.sqliteDb)
  }

  // Node.js chain: NodeFs → SQLite(auto) → browser chain
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { NodeFsBackend } = await import('./backends/node-fs.js')
    return new NodeFsBackend(options?.rootDir ?? process.cwd())
  }

  // Browser chain: OPFS → IndexedDB → Memory (unchanged)
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      await navigator.storage.getDirectory()
      const { OPFSBackend } = await import('./backends/opfs.js')
      return new OPFSBackend()
    } catch {}
  }
  if (typeof indexedDB !== 'undefined') {
    // ... existing IDBStore implementation (unchanged)
  }
  const { MemoryStorage } = await import('./backends/memory.js')
  return new MemoryStorage()
}
```

**Key design decisions:**
- SQLite is **explicit opt-in** via `sqliteDb` option, NOT auto-detected by trying `import('better-sqlite3')`. Rationale: auto-detecting would add a dynamic import attempt that could slow startup and is fragile. Explicit is clearer.
- NodeFs priority is preserved — Node.js always selects NodeFs unless `sqliteDb` is explicitly provided.
- The `sqliteDb` option takes precedence over all auto-detection.

### 3. Function signatures

No new signatures needed. `SQLiteBackend` already exists at `src/backends/sqlite.ts` with constructor `constructor(db: unknown)`.

## Error Handling
- If `options.sqliteDb` is provided but `SQLiteBackend` import fails → throws (developer error, should not silently fall through)
- If no `sqliteDb` option → normal auto-detection chain (no behavior change)

## Test Cases

Add to `test/create-default-backend.test.ts`:

```ts
it('createBackend({ sqliteDb }) returns SQLiteBackend', async () => {
  const mockDb = {
    exec: () => {},
    prepare: () => ({ run: () => {}, get: () => undefined, all: () => [] }),
  }
  const backend = await createBackend({ sqliteDb: mockDb })
  assert.ok(backend instanceof SQLiteBackend)
})

it('createBackend() without sqliteDb uses auto-selection', async () => {
  const backend = await createBackend()
  assert.ok(backend instanceof NodeFsBackend)
})
```

## Dependencies
- None — `SQLiteBackend` already exists and is exported from `src/index.ts`
