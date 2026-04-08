import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

vi.mock('../../src/server/brain.js', () => ({
  chat: vi.fn(async function* () { yield { type: 'content', content: 'hi' }; })
}));
vi.mock('../../src/server/hub.js', () => ({
  getDevices: vi.fn(() => [{ id: 'd1', name: 'test', status: 'online' }]),
  initWebSocket: vi.fn(),
  registerDevice: vi.fn(),
  updateStatus: vi.fn()
}));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16 })
}));
vi.mock('../../src/detector/profiles.js', () => ({
  getProfile: vi.fn().mockResolvedValue({ llm: 'gemma2:2b', stt: 'whisper', tts: 'piper' })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

import { startServer, stopServer } from '../../src/server/api.js';
import { chat } from '../../src/server/brain.js';
import { getDevices } from '../../src/server/hub.js';

let server, base;

beforeAll(async () => {
  server = await startServer(3420);
  base = 'http://localhost:3420';
});

afterAll(() => stopServer(server));

const req = (method, path, body) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

// DBB-004: GET /api/status returns 200 with hardware, profile, devices
describe('DBB-004: GET /api/status', () => {
  it('returns 200 with hardware, profile, devices', async () => {
    const res = await req('GET', '/api/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('hardware');
    expect(body).toHaveProperty('devices');
  });

  it('devices comes from getDevices()', async () => {
    const res = await req('GET', '/api/status');
    const body = await res.json();
    expect(body.devices).toEqual(getDevices());
  });
});

// DBB-005: POST /api/chat SSE stream
describe('DBB-005: POST /api/chat', () => {
  it('returns 400 for missing message', async () => {
    const res = await req('POST', '/api/chat', {});
    expect(res.status).toBe(400);
  });

  it('returns text/event-stream for valid message', async () => {
    chat.mockImplementation(async function* () {
      yield { type: 'content', content: 'hello' };
    });
    const res = await req('POST', '/api/chat', { message: 'hi', history: [] });
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('data:');
  });

  it('ends stream with [DONE]', async () => {
    chat.mockImplementation(async function* () {
      yield { type: 'content', content: 'ok' };
    });
    const res = await req('POST', '/api/chat', { message: 'hi' });
    const text = await res.text();
    expect(text).toContain('[DONE]');
  });

  it('writes error chunk when chat throws', async () => {
    chat.mockImplementation(async function* () {
      throw new Error('llm fail');
    });
    const res = await req('POST', '/api/chat', { message: 'hi' });
    const text = await res.text();
    expect(text).toContain('error');
  });
});

// GET /api/devices
describe('GET /api/devices', () => {
  it('returns device list', async () => {
    const res = await req('GET', '/api/devices');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
