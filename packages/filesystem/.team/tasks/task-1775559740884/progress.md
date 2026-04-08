# Implement auto backend selection

## Progress

Added `createBackend()` to `src/index.ts`. Dropped `AgenticStoreBackend` from fallback chain — it requires an external `AgenticStore` instance and cannot be auto-instantiated. `MemoryStorage` used as final fallback. TypeScript compiles cleanly.

## Update
Added `AgenticStoreBackend` fallback via `typeof indexedDB !== 'undefined'` check. Final order: Node.js → OPFS → AgenticStore → MemoryStorage.
