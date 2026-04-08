# Task Design: Implement auto backend selection

## Overview
Add a `createBackend()` factory function that detects the runtime environment and returns the appropriate `StorageBackend`.

## File to Modify
- `src/index.ts` — add and export `createBackend()`

## Function Signature
```typescript
export async function createBackend(options?: { rootDir?: string }): Promise<StorageBackend>
```

## Detection Logic
```typescript
export async function createBackend(options?: { rootDir?: string }): Promise<StorageBackend> {
  // Node.js
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { NodeFsBackend } = await import('./backends/node-fs.js')
    return new NodeFsBackend(options?.rootDir ?? process.cwd())
  }
  // Browser: OPFS
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      await navigator.storage.getDirectory()
      const { OPFSBackend } = await import('./backends/opfs.js')
      return new OPFSBackend()
    } catch {}
  }
  // Browser: IndexedDB (AgenticStore)
  if (typeof indexedDB !== 'undefined') {
    const { AgenticStoreBackend } = await import('./backends/agentic-store.js')
    return new AgenticStoreBackend()
  }
  // Fallback
  const { MemoryStorage } = await import('./backends/memory.js')
  return new MemoryStorage()
}
```

## Edge Cases
- OPFS `getDirectory()` may throw in non-secure contexts → fall through to AgenticStore
- `rootDir` option only applies to NodeFsBackend; ignored in browser environments

## Dependencies
No new dependencies. Uses existing backend classes.

## Test Cases
- In Node.js environment → returns `NodeFsBackend`
- In browser with OPFS available → returns `OPFSBackend`
- In browser without OPFS but with IndexedDB → returns `AgenticStoreBackend`
- Fallback when no env detected → returns `MemoryStorage`
