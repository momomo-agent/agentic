/**
 * API endpoint tests for task-1775494973876
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
import * as ttsMod from '../../src/runtime/tts.js';

describe('api.js — HTTP endpoints', () => {
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

  it('GET /api/status returns hardware, config, devices (DBB-004)', async () => {
    const res = await fetch(`${baseUrl}/api/status`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('hardware');
    expect(body).toHaveProperty('config');
    expect(body).toHaveProperty('devices');
    expect(Array.isArray(body.devices)).toBe(true);
  });

  it('GET /api/config returns 200 JSON (DBB-005)', async () => {
    const res = await fetch(`${baseUrl}/api/config`);
    expect(res.status).toBe(200);
    expect(typeof await res.json()).toBe('object');
  });

  it('PUT /api/config persists: GET returns updated value (DBB-006)', async () => {
    const cfg = { testKey: `val-${Date.now()}` };
    await fetch(`${baseUrl}/api/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) });
    const body = await (await fetch(`${baseUrl}/api/config`)).json();
    expect(body.testKey).toBe(cfg.testKey);
  });

  it('POST /api/chat returns 400 for missing message', async () => {
    const res = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(400);
  });

  it('POST /api/chat returns SSE stream (DBB-001)', async () => {
    chat.mockImplementation(async function* () { yield { type: 'content', content: 'Hi', done: false }; });
    const res = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'hello' }) });
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toContain('data: [DONE]');
  });

  it('POST /api/transcribe returns 400 without audio (DBB-002)', async () => {
    const res = await fetch(`${baseUrl}/api/transcribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(400);
  });

  it('POST /api/synthesize returns 400 without text (DBB-003)', async () => {
    const res = await fetch(`${baseUrl}/api/synthesize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(400);
  });

  it('POST /api/synthesize returns audio/wav (DBB-003)', async () => {
    ttsMod.synthesize.mockResolvedValueOnce(Buffer.from('RIFF'));
    const res = await fetch(`${baseUrl}/api/synthesize`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'hello' }) });
    expect(res.headers.get('content-type')).toMatch(/audio\//);
  });
});
