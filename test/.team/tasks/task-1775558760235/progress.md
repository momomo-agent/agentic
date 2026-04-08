# Progress: Expand edge-case tests to all backends

## Done
- Added `LocalStorageBackend` to `test/edge-cases.test.ts` (80 tests, all pass)
- Added `LocalStorageBackend` to `test/concurrent.test.ts` (32 tests, all pass)
- Used per-test mock localStorage (isolated Map per backend instance)
- OPFSBackend skipped: requires `navigator.storage` (browser-only, not testable in Node)

## Notes
- Mock localStorage pattern matches existing `local-storage-backend.test.js`
- Each test creates/destroys its own mock to avoid state leakage
