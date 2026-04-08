import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/runtime/llm.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: { type: 'apple-silicon', vram: 16 }, memory: 16, cpu: { cores: 10, model: 'Apple M4' } })
}));

import { startServer } from '../../src/server/api.js';
import { registerDevice, unregisterDevice, getDevices } from '../../src/server/hub.js';

let server, baseUrl;

beforeEach(async () => {
  getDevices().forEach(d => unregisterDevice(d.id));
  const port = 3300 + Math.floor(Math.random() * 100);
  server = await startServer(port);
  baseUrl = `http://localhost:${port}`;
});

afterEach(() => server?.close());

describe('DBB-006: GET /api/status includes devices', () => {
  it('returns devices array with registered device', async () => {
    registerDevice({ id: 'dev-1', name: 'Test', type: 'local' });
    const res = await fetch(`${baseUrl}/api/status`);
    const body = await res.json();
    expect(Array.isArray(body.devices)).toBe(true);
    expect(body.devices.length).toBeGreaterThanOrEqual(1);
    expect(body.devices[0].id).toBe('dev-1');
  });
});

describe('DBB-007: GET /api/status no devices', () => {
  it('returns empty devices array', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    const body = await res.json();
    expect(body.devices).toEqual([]);
  });
});
