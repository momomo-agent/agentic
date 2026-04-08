import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/server/hub.js', () => ({
  getDevices: vi.fn().mockReturnValue([]),
  initWebSocket: vi.fn(),
}));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} }),
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('multer', () => {
  const m = () => ({ single: () => (req, _res, next) => { req.file = req._mockFile; next(); } });
  m.memoryStorage = () => ({});
  return { default: m };
});

import { createApp } from '../../src/server/api.js';
import { chat } from '../../src/server/brain.js';
import { transcribe } from '../../src/runtime/stt.js';
import { synthesize } from '../../src/runtime/tts.js';
import { getDevices } from '../../src/server/hub.js';

let server, base;

beforeEach(() => new Promise((resolve, reject) => {
  vi.resetAllMocks();
  chat.mockImplementation(async function* () {});
  const port = 3700 + Math.floor(Math.random() * 200);
  server = createApp().listen(port);
  server.once('listening', () => { base = `http://localhost:${port}`; resolve(); });
  server.once('error', reject);
}));

afterEach(() => new Promise(r => server.close(r)));

const json = (method, path, body) =>
  fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

// DBB-001: POST /api/chat SSE stream
describe('POST /api/chat', () => {
  it('returns 400 for missing message', async () => {
    const res = await json('POST', '/api/chat', {});
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });

  it('returns text/event-stream content-type', async () => {
    chat.mockImplementation(async function* () { yield { type: 'content', content: 'hi' }; });
    const res = await json('POST', '/api/chat', { message: 'hello' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
  });

  it('streams data events and ends with [DONE]', async () => {
    chat.mockImplementation(async function* () { yield { type: 'content', content: 'hi' }; });
    const res = await json('POST', '/api/chat', { message: 'hello' });
    const text = await res.text();
    expect(text).toMatch(/^data: /m);
    expect(text).toContain('data: [DONE]');
  });

  it('passes message and history to brain.chat', async () => {
    chat.mockImplementation(async function* () {});
    const history = [{ role: 'user', content: 'prev' }];
    await json('POST', '/api/chat', { message: 'hi', history });
    expect(chat).toHaveBeenCalledWith(
      [...history, { role: 'user', content: 'hi' }],
      expect.anything()
    );
  });
});

// DBB-002: POST /api/transcribe
describe('POST /api/transcribe', () => {
  it('returns 400 when no audio file', async () => {
    const res = await json('POST', '/api/transcribe', {});
    expect(res.status).toBe(400);
  });
});

// DBB-003: POST /api/synthesize
describe('POST /api/synthesize', () => {
  it('returns 400 for missing text', async () => {
    const res = await json('POST', '/api/synthesize', {});
    expect(res.status).toBe(400);
  });

  it('returns audio/wav content-type on success', async () => {
    synthesize.mockResolvedValue(Buffer.from('RIFF'));
    const res = await json('POST', '/api/synthesize', { text: 'hello' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/wav/);
  });
});

// DBB-004: GET /api/status
describe('GET /api/status', () => {
  it('returns hardware, profile, devices fields', async () => {
    getDevices.mockReturnValue([{ id: 'dev-1' }]);
    const res = await json('GET', '/api/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('hardware');
    expect(body).toHaveProperty('profile');
    expect(body).toHaveProperty('devices');
    expect(Array.isArray(body.devices)).toBe(true);
  });
});

// DBB-005 + DBB-006: GET/PUT /api/config
describe('/api/config', () => {
  it('GET returns 200 with object', async () => {
    const res = await json('GET', '/api/config');
    expect(res.status).toBe(200);
    expect(typeof await res.json()).toBe('object');
  });

  it('PUT persists: GET returns updated value', async () => {
    const cfg = { model: 'llama3-test-' + Date.now() };
    await json('PUT', '/api/config', cfg);
    const res = await json('GET', '/api/config');
    const body = await res.json();
    expect(body.model).toBe(cfg.model);
  });

  it('PUT returns ok:true', async () => {
    const res = await json('PUT', '/api/config', { x: 1 });
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });
});
