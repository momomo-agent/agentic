# Edge case tests: empty paths and cross-backend consistency

## Progress

- Verified `edge-cases.test.js` already has `empty path rejected` for all 5 backends
- Added `get empty path rejects or returns null` test to `edge-cases.test.js`
- Verified `cross-backend.test.js` covers all 5 backends with get/set/delete/list/scan consistency
