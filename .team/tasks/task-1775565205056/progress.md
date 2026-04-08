# Progress: Expand edge-case tests to all backends

## Done
- Added MemoryStorage and LocalStorageBackend to makeBackends() in test/edge-cases.test.js
- Added makeMockLocalStorage() helper for LocalStorageBackend
- Added `empty path rejected` test (DBB-003)
- Added `concurrent writes 10+ files` test (DBB-002)
- Moved cleanup() to after the last test to avoid EEXIST errors

## Results
- 40/40 tests pass (all backends, all edge cases)
- Empty path validation now works on all backends (task-1775566212258 completed)
- DBB-001, DBB-002, DBB-003 all satisfied
