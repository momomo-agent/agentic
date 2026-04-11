# 优雅关闭 (shutdown)

## Progress

### Completed
- Created `src/server/shutdown.js` with `registerShutdown(server, hub, queue, { stopHealthCheck })`
- Added `closeAllConnections(reason)` export to `src/server/hub.js`
- Updated `src/server/api.js` to use `registerShutdown()` instead of inline SIGINT handler
- Removed hub.js inline SIGINT handler (now centralized in shutdown.js)
- Shutdown sequence: startDrain → waitDrain(10s) → closeAllConnections → stopHealthCheck → server.close → force exit(15s)
- 8 new tests in `test/m103-shutdown.test.js`, all passing
- Updated 4 existing tests that checked for old SIGINT patterns
- All 213 test files pass (1313 tests)

### Commit
cc5da85b feat: implement graceful shutdown (shutdown.js)
