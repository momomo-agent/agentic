import { describe, it, expect, vi } from 'vitest';
import { createServer } from 'net';
import { startServer, stopServer } from '../../src/server/api.js';

vi.mock('../../src/runtime/llm.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({})
}));

describe('EADDRINUSE detection', () => {
  it('rejects with "Port X is already in use" when port is occupied', async () => {
    const port = 3450;
    const blocker = createServer();
    await new Promise(r => blocker.listen(port, r));
    try {
      await expect(startServer(port)).rejects.toThrow(`Port ${port} is already in use`);
    } finally {
      await new Promise(r => blocker.close(r));
    }
  });

  it('each startServer call creates a fresh app instance (no singleton leak)', async () => {
    const port = 3451;
    const s1 = await startServer(port);
    await stopServer(s1);
    const s2 = await startServer(port);
    await stopServer(s2);
    expect(s1).not.toBe(s2);
  });

  it('stopServer then startServer on same port succeeds', async () => {
    const port = 3452;
    const s1 = await startServer(port);
    await stopServer(s1);
    const s2 = await startServer(port);
    expect(s2).toBeDefined();
    await stopServer(s2);
  });
});
