/**
 * M103 DBB verification tests for graceful shutdown (task-1775896028586)
 * Tests DBB-027, DBB-028, DBB-029 and edge cases
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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

describe('DBB-027: Graceful shutdown drains in-flight requests', () => {
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

  it('SIGINT triggers drain then exit 0', async () => {
    const server = makeServer();
    registerShutdown(server, makeHub(), null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(startDrain).toHaveBeenCalled();
    expect(waitDrain).toHaveBeenCalledWith(10_000);
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('SIGTERM also triggers graceful shutdown', async () => {
    const server = makeServer();
    registerShutdown(server, makeHub(), null, { stopHealthCheck: vi.fn() });

    process.emit('SIGTERM');
    await new Promise(r => setTimeout(r, 50));

    expect(startDrain).toHaveBeenCalled();
    expect(server.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('drain timeout does not prevent shutdown', async () => {
    waitDrain.mockRejectedValueOnce(new Error('drain timeout'));
    const server = makeServer();
    registerShutdown(server, makeHub(), null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    // Should still proceed to close server
    expect(server.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});

describe('DBB-028: Graceful shutdown closes WebSocket connections', () => {
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

  it('calls hub.closeAllConnections with shutdown reason', async () => {
    const server = makeServer();
    const hub = makeHub();
    registerShutdown(server, hub, null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(hub.closeAllConnections).toHaveBeenCalledWith('server shutting down');
  });

  it('handles null hub gracefully', async () => {
    const server = makeServer();
    registerShutdown(server, null, null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    // Should not throw, should still close server
    expect(server.close).toHaveBeenCalled();
  });

  it('handles hub without closeAllConnections method', async () => {
    const server = makeServer();
    registerShutdown(server, {}, null, { stopHealthCheck: vi.fn() });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(server.close).toHaveBeenCalled();
  });
});

describe('DBB-029: Graceful shutdown stops health check timer', () => {
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

  it('calls stopHealthCheck during shutdown', async () => {
    const server = makeServer();
    const stopHealthCheck = vi.fn();
    registerShutdown(server, makeHub(), null, { stopHealthCheck });

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(stopHealthCheck).toHaveBeenCalledTimes(1);
  });

  it('handles missing stopHealthCheck gracefully', async () => {
    const server = makeServer();
    registerShutdown(server, makeHub(), null, {});

    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    // Should not throw
    expect(server.close).toHaveBeenCalled();
  });
});

describe('shutdown.js source verification', () => {
  it('exports registerShutdown function', () => {
    expect(typeof registerShutdown).toBe('function');
  });

  it('source handles both SIGINT and SIGTERM', () => {
    const src = readFileSync(resolve(import.meta.dirname, '../src/server/shutdown.js'), 'utf8');
    expect(src).toContain("process.once('SIGINT'");
    expect(src).toContain("process.once('SIGTERM'");
  });

  it('source has force exit timeout (15s)', () => {
    const src = readFileSync(resolve(import.meta.dirname, '../src/server/shutdown.js'), 'utf8');
    expect(src).toContain('15_000');
    expect(src).toContain('.unref()');
  });

  it('source imports startDrain and waitDrain from api.js', () => {
    const src = readFileSync(resolve(import.meta.dirname, '../src/server/shutdown.js'), 'utf8');
    expect(src).toContain('startDrain');
    expect(src).toContain('waitDrain');
  });
});

describe('hub.js closeAllConnections verification', () => {
  it('hub.js exports closeAllConnections', () => {
    const src = readFileSync(resolve(import.meta.dirname, '../src/server/hub.js'), 'utf8');
    expect(src).toContain('export function closeAllConnections');
  });

  it('closeAllConnections sends shutdown message to clients', () => {
    const src = readFileSync(resolve(import.meta.dirname, '../src/server/hub.js'), 'utf8');
    expect(src).toContain("type: 'shutdown'");
    expect(src).toContain('.close(1001');
  });

  it('closeAllConnections clears registry', () => {
    const src = readFileSync(resolve(import.meta.dirname, '../src/server/hub.js'), 'utf8');
    expect(src).toContain('registry.clear()');
  });
});

describe('shutdown sequence order', () => {
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

  it('executes shutdown steps in correct order: drain → WS → health → server', async () => {
    const order = [];
    startDrain.mockImplementation(() => order.push('drain'));
    waitDrain.mockImplementation(() => { order.push('waitDrain'); return Promise.resolve(); });
    const hub = { closeAllConnections: vi.fn(() => order.push('closeWS')) };
    const stopHealthCheck = vi.fn(() => order.push('stopHealth'));
    const server = { close: vi.fn(cb => { order.push('closeServer'); cb(); }) };

    registerShutdown(server, hub, null, { stopHealthCheck });
    process.emit('SIGINT');
    await new Promise(r => setTimeout(r, 50));

    expect(order).toEqual(['drain', 'waitDrain', 'closeWS', 'stopHealth', 'closeServer']);
  });
});
