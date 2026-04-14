/**
 * Auth middleware tests for task-1775896028548 (M103)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/server/core-bridge.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

import { chat } from '../../src/server/core-bridge.js';
import { createApp } from '../../src/server/api.js';

describe('authMiddleware', () => {
  let server, baseUrl;
  const TEST_KEY = 'test-secret-key-123';

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    process.env.AGENTIC_API_KEY = TEST_KEY;
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(async () => {
    delete process.env.AGENTIC_API_KEY;
    await new Promise(r => server.close(r));
  });

  it('rejects request without Authorization header', async () => {
    const res = await fetch(`${baseUrl}/api/config`);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.type).toBe('authentication_error');
  });

  it('rejects request with wrong key', async () => {
    const res = await fetch(`${baseUrl}/api/config`, {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(res.status).toBe(401);
  });

  it('accepts request with correct key', async () => {
    const res = await fetch(`${baseUrl}/api/config`, {
      headers: { Authorization: `Bearer ${TEST_KEY}` },
    });
    expect(res.status).toBe(200);
  });

  it('allows /health without auth', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
  });

  it('allows /admin without auth', async () => {
    // admin serves static files — may 404 if no dist, but should NOT be 401
    const res = await fetch(`${baseUrl}/admin`);
    expect(res.status).not.toBe(401);
  });

  it('rejects non-Bearer auth scheme', async () => {
    const res = await fetch(`${baseUrl}/api/config`, {
      headers: { Authorization: `Basic ${TEST_KEY}` },
    });
    expect(res.status).toBe(401);
  });

  // DBB-025: /api/health must be exempt from auth
  it('allows /api/health without auth (DBB-025)', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).not.toBe(401);
  });

  // /v1/* routes require auth
  it('rejects /v1/models without auth', async () => {
    const res = await fetch(`${baseUrl}/v1/models`);
    expect(res.status).toBe(401);
  });
});

describe('authMiddleware disabled (no API_KEY)', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    delete process.env.AGENTIC_API_KEY;
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(async () => {
    await new Promise(r => server.close(r));
  });

  it('allows all requests when API_KEY is not set', async () => {
    const res = await fetch(`${baseUrl}/api/config`);
    expect(res.status).toBe(200);
  });
});
