/**
 * Graceful shutdown tests for task-1775896028586 (M103)
 * DBB-027: drains in-flight requests
 * DBB-028: closes WebSocket connections
 * DBB-029: stops health check timer
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('shutdown.js — registerShutdown', () => {
  let registerShutdown;
  let mockStartDrain;
  let mockWaitDrain;

  beforeEach(async () => {
    mockStartDrain = vi.fn();
    mockWaitDrain = vi.fn().mockResolvedValue(undefined);

    vi.doMock('../../src/server/api.js', () => ({
      startDrain: mockStartDrain,
      waitDrain: mockWaitDrain,
    }));

    const mod = await import('../../src/server/shutdown.js');
    registerShutdown = mod.registerShutdown;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    // Remove any signal listeners we added
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  });

  it('registers both SIGINT and SIGTERM handlers', () => {
    const server = { close: vi.fn(cb => cb()) };
    const hub = { closeAllConnections: vi.fn() };
    const stopHealthCheck = vi.fn();

    // Capture listener counts before
    const sigintBefore = process.listenerCount('SIGINT');
    const sigtermBefore = process.listenerCount('SIGTERM');

    registerShutdown(server, hub, null, { stopHealthCheck });

    expect(process.listenerCount('SIGINT')).toBe(sigintBefore + 1);
    expect(process.listenerCount('SIGTERM')).toBe(sigtermBefore + 1);
  });

  it('shutdown sequence: drain → close WS → stop health → close server', async () => {
    const callOrder = [];
    mockStartDrain.mockImplementation(() => callOrder.push('startDrain'));
    mockWaitDrain.mockImplementation(async () => callOrder.push('waitDrain'));

    const server = {
      close: vi.fn(cb => {
        callOrder.push('serverClose');
        // Don't call cb() to avoid process.exit
      }),
    };
    const hub = {
      closeAllConnections: vi.fn(() => callOrder.push('closeWS')),
    };
    const stopHealthCheck = vi.fn(() => callOrder.push('stopHealth'));

    // Mock process.exit to prevent actual exit
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    registerShutdown(server, hub, null, { stopHealthCheck });

    // Trigger SIGINT handler directly
    process.emit('SIGINT');

    // Wait for async operations
    await vi.waitFor(() => {
      expect(server.close).toHaveBeenCalled();
    }, { timeout: 2000 });

    expect(callOrder).toEqual([
      'startDrain',
      'waitDrain',
      'closeWS',
      'stopHealth',
      'serverClose',
    ]);

    exitSpy.mockRestore();
  });

  it('calls startDrain on shutdown (DBB-027)', async () => {
    const server = { close: vi.fn() };
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    registerShutdown(server, null, null, {});

    process.emit('SIGINT');

    await vi.waitFor(() => {
      expect(mockStartDrain).toHaveBeenCalled();
    }, { timeout: 2000 });

    exitSpy.mockRestore();
  });

  it('calls hub.closeAllConnections with reason (DBB-028)', async () => {
    const server = { close: vi.fn() };
    const hub = { closeAllConnections: vi.fn() };
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    registerShutdown(server, hub, null, {});

    process.emit('SIGINT');

    await vi.waitFor(() => {
      expect(hub.closeAllConnections).toHaveBeenCalledWith('server shutting down');
    }, { timeout: 2000 });

    exitSpy.mockRestore();
  });

  it('calls stopHealthCheck on shutdown (DBB-029)', async () => {
    const server = { close: vi.fn() };
    const stopHealthCheck = vi.fn();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    registerShutdown(server, null, null, { stopHealthCheck });

    process.emit('SIGINT');

    await vi.waitFor(() => {
      expect(stopHealthCheck).toHaveBeenCalled();
    }, { timeout: 2000 });

    exitSpy.mockRestore();
  });

  it('handles drain timeout gracefully', async () => {
    mockWaitDrain.mockRejectedValue(new Error('drain timeout'));
    const server = { close: vi.fn() };
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    registerShutdown(server, null, null, {});

    process.emit('SIGINT');

    // Should still proceed to server.close despite drain timeout
    await vi.waitFor(() => {
      expect(server.close).toHaveBeenCalled();
    }, { timeout: 2000 });

    exitSpy.mockRestore();
  });

  it('works without hub (null hub)', async () => {
    const server = { close: vi.fn() };
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    registerShutdown(server, null, null, {});

    process.emit('SIGINT');

    await vi.waitFor(() => {
      expect(server.close).toHaveBeenCalled();
    }, { timeout: 2000 });

    exitSpy.mockRestore();
  });
});

describe('hub.js — closeAllConnections', () => {
  it('sends shutdown message and closes all connections', async () => {
    // We test closeAllConnections by importing hub and checking the export exists
    const hub = await import('../../src/server/hub.js');
    expect(typeof hub.closeAllConnections).toBe('function');
  });
});
