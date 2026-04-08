# Design: Automatic backend selection based on runtime environment

## Analysis
`createBackend()` in `src/index.ts` already implements full auto-selection logic:
1. Node.js → `NodeFsBackend`
2. Browser + OPFS → `OPFSBackend`
3. Browser + IndexedDB → `AgenticStoreBackend`
4. Fallback → `MemoryStorage`

The only blocker is the broken `new AgenticStoreBackend()` call (fixed by task-1775567388705).

## Files to Modify
None beyond task-1775567388705's fix to `src/index.ts`.

## Verification Steps
1. After task-1775567388705 is complete, `npm run build` succeeds
2. `npm test` — DBB-003, DBB-004, DBB-005 pass
3. Manual check: `createBackend()` in Node.js returns `NodeFsBackend` instance
