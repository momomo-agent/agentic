# Fix config-persistence test — JSON parse error on atomic write

## Root Cause
Port collisions — multiple test files used `3400 + Math.floor(Math.random() * 100)` for server ports, causing EADDRINUSE when tests ran in parallel during the full suite. This manifested as 500 errors on PUT requests.

## Fix
Changed all server test files to use `startServer(0)` (OS-assigned port) + `server.address().port`. Eliminates port collisions entirely.

## Files Changed
- test/server/config-persistence.test.js
- test/server/api-m6.test.js
- test/server/tts-api.test.js
- test/server/hub-api.test.js
- test/server/transcribe-api.test.js

## Additional Fix
Added `_writeQueue` promise chain to `setConfig()` and `initFromProfile()` in `src/config.js` to serialize concurrent writes and prevent ENOENT race on the shared `.tmp` file.

## Result
173/173 test files pass, 972/983 tests pass (11 skipped), 0 failures.
