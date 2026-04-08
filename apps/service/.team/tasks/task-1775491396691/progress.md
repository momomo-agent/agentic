# 修复 EADDRINUSE 检测

## Progress

Refactored `src/server/api.js` — moved `express()` singleton into `createApp()` factory. `startServer()` now creates a fresh app each call. Added `stopServer()`. All 22 tests pass including EADDRINUSE test.
