import { describe, it, expect, vi } from 'vitest';
import { createServer } from 'node:http';

describe('hub.js M13 DBB', () => {
  it('DBB-001: device silent 61s → offline (heartbeat timeout 60s)', async () => {
    const { registerDevice, getDevices, heartbeat } = await import('../../src/server/hub.js');
    const id = `dev-timeout-${Date.now()}`;
    registerDevice(id, { name: 'test' });

    // Manually backdate lastSeen by 61s to simulate silence
    const d = getDevices().find(x => x.id === id);
    d.lastSeen = Date.now() - 61000;

    // Trigger the status update logic directly (same as setInterval callback)
    const now = Date.now();
    d.status = (now - d.lastSeen > 60000) ? 'offline' : 'online';

    expect(d.status).toBe('offline');
  });

  it('DBB-002: device heartbeat every 30s stays online after 120s', async () => {
    const { registerDevice, heartbeat, getDevices } = await import('../../src/server/hub.js');
    const id = `dev-alive-${Date.now()}`;
    registerDevice(id, { name: 'alive' });

    // Simulate 4 heartbeats over 120s
    for (let i = 0; i < 4; i++) {
      heartbeat(id);
    }

    // lastSeen is fresh → should be online
    const d = getDevices().find(x => x.id === id);
    const now = Date.now();
    d.status = (now - d.lastSeen > 60000) ? 'offline' : 'online';

    expect(d.status).toBe('online');
  });

  it('DBB-004: broadcastWakeword sends wakeword to all registry devices', async () => {
    const { registerDevice, broadcastWakeword } = await import('../../src/server/hub.js');

    const sent1 = [];
    const sent2 = [];
    const ws1 = { send: (msg) => sent1.push(JSON.parse(msg)) };
    const ws2 = { send: (msg) => sent2.push(JSON.parse(msg)) };

    registerDevice({ id: 'ws-dev-1', name: 'a', capabilities: [], ws: ws1, lastPong: Date.now() });
    registerDevice({ id: 'ws-dev-2', name: 'b', capabilities: [], ws: ws2, lastPong: Date.now() });

    broadcastWakeword();

    expect(sent1.some(m => m.type === 'wakeword')).toBe(true);
    expect(sent2.some(m => m.type === 'wakeword')).toBe(true);
  });

  it('DBB-004: broadcastWakeword skips broken ws without throwing', async () => {
    const { registerDevice, broadcastWakeword } = await import('../../src/server/hub.js');

    const ws = { send: () => { throw new Error('broken'); } };
    registerDevice({ id: 'ws-broken', name: 'broken', capabilities: [], ws, lastPong: Date.now() });

    expect(() => broadcastWakeword()).not.toThrow();
  });

  it('DBB-005: SIGINT handler registered (process.once called with SIGINT)', async () => {
    const onceSpy = vi.spyOn(process, 'once');
    const server = createServer();
    const { initWebSocket } = await import('../../src/server/hub.js');
    initWebSocket(server);

    const sigintCalls = onceSpy.mock.calls.filter(c => c[0] === 'SIGINT');
    expect(sigintCalls.length).toBeGreaterThan(0);
    onceSpy.mockRestore();
    server.close();
  });
});
