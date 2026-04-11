/**
 * Health check endpoint tests for task-1775893487734 (M103)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

import { createApp } from '../../src/server/api.js';
import { chat } from '../../src/server/brain.js';

describe('GET /api/health — detailed health check', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  it('DBB-001: returns 200 with ollama, stt, tts fields', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('ollama');
    expect(body).toHaveProperty('stt');
    expect(body).toHaveProperty('tts');
    expect(body.ollama).toHaveProperty('status');
    expect(body.stt).toHaveProperty('status');
    expect(body.tts).toHaveProperty('status');
  });

  it('DBB-002: returns degraded when Ollama is down', async () => {
    const orig = process.env.OLLAMA_HOST;
    process.env.OLLAMA_HOST = 'http://127.0.0.1:1'; // unreachable port
    try {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('degraded');
      expect(body.ollama.status).toBe('degraded');
    } finally {
      if (orig !== undefined) process.env.OLLAMA_HOST = orig;
      else delete process.env.OLLAMA_HOST;
    }
  });

  it('DBB-003: returns 200 even with empty engine registry', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // No engines registered in test env
    expect(body.stt.status).toBe('unavailable');
    expect(body.tts.status).toBe('unavailable');
  });

  it('DBB-012: responds within 2000ms', async () => {
    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/health`);
    const elapsed = Date.now() - start;
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(elapsed).toBeLessThan(2000);
    expect(body).toHaveProperty('responseTime');
    expect(body).toHaveProperty('uptime');
  });
});
