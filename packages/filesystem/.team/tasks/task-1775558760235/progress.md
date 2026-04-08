# Expand edge-case tests to all backends

## Done
- Added LocalStorageBackend to edge-cases.test.ts (80 tests pass)
- Added LocalStorageBackend to concurrent.test.ts (32 tests pass)
- OPFSBackend skipped: browser-only (navigator.storage not available in Node)
