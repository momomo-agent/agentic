# Fix empty path validation in 3 backends

## Progress

Added validatePath() to 4 backends (design said 3, but NodeFsBackend.get() also needed it — it was catching errors and returning null instead of throwing):

- memory.ts: added IOError import + validatePath + calls in get/set/delete
- local-storage.ts: added validatePath + calls in get/set/delete
- agentic-store.ts: added IOError import + validatePath + calls in get/set/delete/stat
- node-fs.ts: added IOError import + validatePath + calls in get/set/delete

Updated 2 outdated tests: edge-cases.test.ts:63 and stat-implementation.test.js:112 now expect rejection instead of null.

Result: 330 tests pass, 0 failures.
