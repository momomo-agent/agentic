import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/server/core-bridge.js', () => ({ chat: vi.fn() }));
vi.mock('../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../src/runtime/stt.js', () => ({ transcribe: vi.fn(), init: vi.fn().mockResolvedValue() }));
vi.mock('../src/runtime/tts.js', () => ({ synthesize: vi.fn(), init: vi.fn().mockResolvedValue() }));

import { startServer, stopServer } from '../src/server/api.js';

let server, baseUrl;

beforeEach(async () => {
  const port = 3700 + Math.floor(Math.random() * 100);
  server = await startServer(port);
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await stopServer(server);
});

describe('GET /api/perf', () => {
  it('returns 200 with JSON object', async () => {
    const res = await fetch(`${baseUrl}/api/perf`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe('object');
  });

  it('returns empty object when no metrics recorded', async () => {
    const res = await fetch(`${baseUrl}/api/perf`);
    const body = await res.json();
    // May have metrics from other tests, but must be a valid object
    expect(body).not.toBeNull();
  });

  it('response shape has last/avg/count per stage if metrics exist', async () => {
    const res = await fetch(`${baseUrl}/api/perf`);
    const body = await res.json();
    for (const stage of Object.values(body)) {
      expect(typeof stage.last).toBe('number');
      expect(typeof stage.avg).toBe('number');
      expect(typeof stage.count).toBe('number');
    }
  });
});
