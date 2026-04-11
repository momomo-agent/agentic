import { startDrain, waitDrain } from './api.js';

/**
 * Register graceful shutdown handlers for SIGINT and SIGTERM.
 * @param {import('http').Server} server - HTTP server instance
 * @param {{ closeAllConnections?: Function }} hub - WebSocket hub
 * @param {object|null} queue - request queue (reserved for future drain)
 * @param {{ stopHealthCheck?: Function }} opts
 */
export function registerShutdown(server, hub, queue, { stopHealthCheck } = {}) {
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
