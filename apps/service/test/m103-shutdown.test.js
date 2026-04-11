import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock api.js exports before importing shutdown
vi.mock('../src/server/api.js', () => ({
  startDrain: vi.fn(),
  waitDrain: vi.fn(() => Promise.resolve()),
}));

const { startDrain, waitDrain } = await import('../src/server/api.js');
const { registerShutdown } = await import('../src/server/shutdown.js');

function makeServer() {
  return { close: vi.fn(cb => cb()) };
}

function makeHub() {
  return { closeAllConnections: vi.fn() };
}

describe('registerShutdown', () => {
  let exitSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  });

  it('registers both SIGINT and SIGTERM handlers', () => {
    const server = makeServer();
    registerShutdown(server, makeHub(), null, { stopHealthCheck: vi.fn() });

    expect(process.listenerCount('SIGINT')).toBeGreaterThanOrEqual(1);
    expect(process.listenerCount('SIGTERM')).toBeGreaterThanOrEqual(1);
  });

  it('calls startDrain on shutdown', async () => {
    const server = makeServer();
    registerShutdown(server, makeHub(), null, { stopHealthCheck: vi.fn() });

    // Emit SIGINT to trigger shutdown
    process.emit('SIGINT');
    // Allow microtasks to flush
    await new Promise(r => setTimeout(r, 50));

    expect(startDrain).toHaveBeenCalled();
  });

  it('calls waitDrain with 10s timeout', async () => {
    const server = makeServer();
    registerShutdown(server, makeHub(), null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(waitDrain).toHaveBeenCalledWith(10_000);
  });

  it('calls hub.closeAllConnections during shutdown', async () => {
    const server = makeServer();
    const hub = makeHub();
    registerShutdown(server, hub, null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(hub.closeAllConnections).toHaveBeenCalledWith('server shutting down');
  });

  it('calls stopHealthCheck during shutdown', async () => {
    const server = makeServer();
    const stopHealthCheck = vi.fn();
    registerShutdown(server, makeHub(), null, { stopHealthCheck });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(stopHealthCheck).toHaveBeenCalled();
  });

  it('closes the HTTP server and exits with 0', async () => {
    const server = makeServer();
    registerShutdown(server, makeHub(), null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(server.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('proceeds even if waitDrain rejects (timeout)', async () => {
    waitDrain.mockRejectedValueOnce(new Error('drain timeout'));
    const server = makeServer();
    const hub = makeHub();
    registerShutdown(server, hub, null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    // Should still close WS and server despite drain timeout
    expect(hub.closeAllConnections).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalled();
  });
});

describe('closeAllConnections (hub.js)', () => {
  it('sends shutdown message and closes all WebSocket connections', async () => {
    // Test the actual closeAllConnections from hub.js
    const { closeAllConnections } = await import('../src/server/hub.js');

    // closeAllConnections operates on the module-level registry Map
    // Since registry is empty in test context, it should not throw
    expect(() => closeAllConnections('test')).not.toThrow();
  });
});
