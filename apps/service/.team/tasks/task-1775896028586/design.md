# Task Design: 优雅关闭 (shutdown)

**Task ID:** task-1775896028586
**Module:** Server (ARCHITECTURE.md §3)
**Module Design:** `.team/designs/server.design.md`
**Blocked By:** task-1775896028427 (health.js — needs `stopHealthCheck()`)

## Files to Modify

### `src/server/api.js`
- Enhance existing SIGINT handler (lines 911-916)
- Add SIGTERM handler
- Import shutdown dependencies

### `src/server/hub.js`
- Add `closeAllConnections()` export for WebSocket cleanup

## Current Shutdown Code (api.js lines 913-918)

```javascript
process.once('SIGINT', async () => {
  startDrain();
  // stopWake(); // Disabled
  try { await waitDrain(10_000); } catch { /* timeout, proceed */ }
  httpServer.close(() => process.exit(0));
});
```

## Design

### New hub.js Export

```javascript
// src/server/hub.js — ADD:
export function closeAllConnections(reason = 'shutdown') {
  // registry is the Map<id, { ws, ... }> at line 11
  for (const [id, device] of registry) {
    try {
      device.ws.send(JSON.stringify({ type: 'shutdown', reason }));
      device.ws.close(1001, reason);  // 1001 = Going Away
    } catch { /* ignore already-closed connections */ }
  }
  registry.clear();
}
```

### Enhanced Shutdown in api.js

```javascript
import { stopHealthCheck } from '../engine/health.js';
import { closeAllConnections } from './hub.js';

// Replace the existing process.once('SIGINT', ...) block:
async function gracefulShutdown(httpServer) {
  console.log('[shutdown] starting graceful shutdown...');

  // 1. Stop accepting new requests
  startDrain();

  // 2. Wait for in-flight requests (max 10s)
  try {
    await waitDrain(10_000);
    console.log('[shutdown] all requests drained');
  } catch {
    console.warn('[shutdown] drain timeout, proceeding');
  }

  // 3. Close WebSocket connections
  closeAllConnections('server shutting down');
  console.log('[shutdown] WebSocket connections closed');

  // 4. Stop health check timers
  stopHealthCheck();
  console.log('[shutdown] health check stopped');

  // 5. Close HTTP server
  httpServer.close(() => {
    console.log('[shutdown] HTTP server closed');
    process.exit(0);
  });

  // 6. Force exit after 15s if close hangs
  setTimeout(() => {
    console.error('[shutdown] forced exit after timeout');
    process.exit(1);
  }, 15_000).unref();
}

// Register both signals
process.once('SIGINT', () => gracefulShutdown(httpServer));
process.once('SIGTERM', () => gracefulShutdown(httpServer));
```

### Temp File Cleanup

Task mentions "清理临时文件". Current codebase uses `multer.memoryStorage()` (no temp files on disk). The only temp files would be from `os.tmpdir()` usage. Grep shows no explicit temp file creation in the codebase. Skip temp file cleanup — nothing to clean.

## Step-by-Step Implementation

1. In `src/server/hub.js`:
   - Add `closeAllConnections(reason)` export
   - Uses existing `registry` Map (line 11)

2. In `src/server/api.js`:
   - Add imports: `import { stopHealthCheck } from '../engine/health.js';` and update hub.js import to include `closeAllConnections`
   - Extract `gracefulShutdown(httpServer)` async function
   - Replace `process.once('SIGINT', ...)` with both SIGINT and SIGTERM handlers
   - Add 15s force-exit safety net

3. Write tests

## Test Cases

```javascript
// tests/server/shutdown.test.js

// Test 1: gracefulShutdown calls startDrain()
// Test 2: gracefulShutdown waits for in-flight requests via waitDrain()
// Test 3: closeAllConnections sends shutdown message to all WebSocket clients
// Test 4: closeAllConnections clears registry
// Test 5: SIGTERM triggers graceful shutdown (same as SIGINT)
```

Note: Testing process signal handlers is tricky. Use a child process or mock `process.once`. For unit tests, test `gracefulShutdown()` directly by mocking its dependencies.

## ⚠️ Unverified Assumptions

- `hub.js` `registry` Map: verified at line 11 — `const registry = new Map()`. Each entry has `{ ws, name, capabilities, lastPong }`. The `ws` object is a `ws` WebSocket instance with `.send()` and `.close()` methods.
- `stopHealthCheck()` from health.js: depends on task-1775896028427 being implemented first. If health.js doesn't exist yet, the import will fail. Implementation order must respect the `blockedBy` dependency.
- The `httpServer` variable is local to `startServer()`. The shutdown handler is registered inside `startServer()` so it has closure access. This is already the case in the current code.
