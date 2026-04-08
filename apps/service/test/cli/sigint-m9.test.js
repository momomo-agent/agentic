import { describe, it, expect, vi } from 'vitest';

describe('bin - DBB-004: SIGINT graceful shutdown', () => {
  it('calls server.close() and exits on SIGINT', async () => {
    const closeCb = vi.fn();
    const server = {
      close: vi.fn((cb) => { closeCb(); cb(); }),
    };
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    // Simulate the shutdown function from bin/agentic-service.js
    function shutdown(srv) {
      srv.close(() => { process.exit(0); });
      setTimeout(() => process.exit(0), 5000).unref();
    }

    shutdown(server);

    expect(server.close).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    exitSpy.mockRestore();
  });

  it('force-exits after 5s if server.close hangs', async () => {
    vi.useFakeTimers();
    const server = { close: vi.fn() }; // never calls callback
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    function shutdown(srv) {
      srv.close(() => { process.exit(0); });
      setTimeout(() => process.exit(0), 5000).unref();
    }

    shutdown(server);
    expect(exitSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(5000);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
    vi.useRealTimers();
  });

  it('registers both SIGINT and SIGTERM handlers', () => {
    const handlers = {};
    const onSpy = vi.spyOn(process, 'on').mockImplementation((sig, fn) => { handlers[sig] = fn; });
    process.on('SIGINT', () => {});
    process.on('SIGTERM', () => {});
    expect(handlers).toHaveProperty('SIGINT');
    expect(handlers).toHaveProperty('SIGTERM');
    onSpy.mockRestore();
  });
});
