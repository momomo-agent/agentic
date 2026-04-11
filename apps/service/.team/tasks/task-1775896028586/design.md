# Task Design: 优雅关闭 (shutdown)

**Task ID:** task-1775896028586
**Module:** Server (ARCHITECTURE.md §3)
**Module Design:** `.team/designs/server.design.md`
**Blocked By:** task-1775896028427 (health.js — needs `stopHealthCheck()`) ✅ DONE

## Files to Create

### `src/server/shutdown.js` (NEW — per ARCHITECTURE.md spec)

## Files to Modify

### `src/server/api.js`
- Replace inline SIGINT handler with `registerShutdown()` call
- Import `registerShutdown` from `./shutdown.js`

### `src/server/hub.js`
- Add `closeAllConnections()` export for WebSocket cleanup

## Current Shutdown Code (api.js lines 952-957)

```javascript
process.once('SIGINT', async () => {
  startDrain();
  // stopWake(); // Disabled
  try { await waitDrain(10_000); } catch { /* timeout, proceed */ }
  httpServer.close(() => process.exit(0));
});
```

## Design

### New File: `src/server/shutdown.js`

Per ARCHITECTURE.md: `export function registerShutdown(server, hub, queue, { stopHealthCheck })`

```javascript
// src/server/shutdown.js
import { startDrain, waitDrain } from './api.js';

/**
 * Register graceful shutdown handlers for SIGINT and SIGTERM
 * @param {http.Server} server - HTTP server instance
 * @param {{ closeAllConnections: Function }} hub - WebSocket hub
 * @param {object|null} queue - request queue (unused for now, reserved for drain)
 * @param {{ stopHealthCheck: Function }} opts
 */
export function registerShutdown(server, hub, queue, { stopHealthCheck }) {
  async function shutdown() {
    console.log('[shutdown] starting graceful shutdown...');

    // 1. Stop accepting new requests (503 for new ones)
    startDrain();

    // 2. Wait for in-flight requests (max 10s)
    try {
      await waitDrain(10_000);
      console.log('[shutdown] all requests drained');
    } catch {
      console.warn('[shutdown] drain timeout, proceeding');
    }

    // 3. Close WebSocket connections
    if (hub?.closeAllConnections) {
      hub.closeAllConnections('server shutting down');
      console.log('[shutdown] WebSocket connections closed');
    }

    // 4. Stop health check timers
    if (stopHealthCheck) {
      stopHealthCheck();
      console.log('[shutdown] health check stopped');
    }

    // 5. Close HTTP server
    server.close(() => {
      console.log('[shutdown] HTTP server closed');
      process.exit(0);
    });

    // 6. Force exit after 15s if close hangs
    setTimeout(() => {
      console.error('[shutdown] forced exit after timeout');
      process.exit(1);
    }, 15_000).unref();
  }

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
```

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

### api.js Changes

```javascript
// REMOVE the existing process.once('SIGINT', ...) block (lines 952-957)

// ADD after httpServer creation and initWebSocket:
import { registerShutdown } from './shutdown.js';
import { stopHealthCheck } from '../engine/health.js';
import * as hub from './hub.js';  // or import closeAllConnections specifically

registerShutdown(httpServer, hub, null, { stopHealthCheck });
```

Note: `startDrain` and `waitDrain` are already exported from api.js, so shutdown.js can import them.

### Temp File Cleanup

Task mentions "清理临时文件". Current codebase uses `multer.memoryStorage()` (no temp files on disk). Grep shows no explicit temp file creation. Skip temp file cleanup — nothing to clean.

## Step-by-Step Implementation

1. In `src/server/hub.js`:
   - Add `closeAllConnections(reason)` export
   - Uses existing `registry` Map (line 11)

2. Create `src/server/shutdown.js`:
   - Import `startDrain`, `waitDrain` from `./api.js`
   - Export `registerShutdown(server, hub, queue, { stopHealthCheck })`
   - Handle both SIGINT and SIGTERM
   - Sequence: drain → close WS → stop health → close server → force exit

3. In `src/server/api.js`:
   - Import `registerShutdown` from `./shutdown.js`
   - Import `stopHealthCheck` from `../engine/health.js`
   - Replace inline SIGINT handler with `registerShutdown(httpServer, hub, null, { stopHealthCheck })`
   - Pass hub module (needs `closeAllConnections`)

4. Write tests

## Test Cases

```javascript
// tests/server/shutdown.test.js

// Test 1: registerShutdown registers both SIGINT and SIGTERM handlers
// Test 2: shutdown calls startDrain()
// Test 3: shutdown waits for in-flight requests via waitDrain()
// Test 4: closeAllConnections sends { type: 'shutdown' } to all WebSocket clients
// Test 5: closeAllConnections clears registry
```

Note: Testing process signal handlers is tricky. For unit tests, test the shutdown sequence by mocking dependencies and calling the shutdown function directly.

## ⚠️ Unverified Assumptions

- `hub.js` `registry` Map: verified at line 11 — `const registry = new Map()`. Each entry has `{ ws, name, capabilities, lastPong }`. The `ws` object is a `ws` WebSocket instance with `.send()` and `.close()` methods.
- `stopHealthCheck()` from health.js: ✅ IMPLEMENTED (task-1775896028427 done, in review). Verified export at health.js line 53.
- Circular import risk: `shutdown.js` imports `startDrain`/`waitDrain` from `api.js`. This is safe because both are simple function exports that don't depend on module initialization order.
- The `httpServer` variable is local to `startServer()`. `registerShutdown()` receives it as a parameter, so no closure issue.
