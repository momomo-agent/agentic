import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

vi.mock('../../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('../../src/runtime/vad.js', () => ({ detectVoiceActivity: vi.fn().mockReturnValue(true) }));

import { chat } from '../../src/server/brain.js';
import * as stt from '../../src/runtime/stt.js';
import * as tts from '../../src/runtime/tts.js';
import { startServer, stopServer } from '../../src/server/api.js';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

let server, baseUrl;

async function req(method, p, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return fetch(`${baseUrl}${p}`, opts);
}

beforeEach(async () => {
  const port = 3400 + Math.floor(Math.random() * 100);
  server = await startServer(port);
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => { await stopServer(server); });

// DBB-001: POST /api/chat SSE stream
describe('POST /api/chat', () => {
  it('returns 400 for missing message', async () => {
    const res = await req('POST', '/api/chat', {});
    expect(res.status).toBe(400);
  });

  it('returns SSE stream (DBB-001)', async () => {
    chat.mockImplementation(async function* () {
      yield { type: 'content', content: 'Hi', done: false };
    });
    const res = await req('POST', '/api/chat', { message: 'hello' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    const text = await res.text();
    expect(text).toContain('data:');
    expect(text).toContain('[DONE]');
  });

  it('passes history to chat', async () => {
    chat.mockImplementation(async function* () {});
    const history = [{ role: 'user', content: 'prev' }];
    await req('POST', '/api/chat', { message: 'hi', history });
    expect(chat).toHaveBeenCalledWith(
      [...history, { role: 'user', content: 'hi' }],
      expect.objectContaining({})
    );
  });

  it('writes error chunk on chat failure', async () => {
    chat.mockImplementation(async function* () { throw new Error('LLM down'); });
    const res = await req('POST', '/api/chat', { message: 'hi' });
    const text = await res.text();
    expect(text).toContain('LLM down');
  });
});

// DBB-002: POST /api/transcribe
describe('POST /api/transcribe', () => {
  it('returns 400 when no audio file', async () => {
    const res = await req('POST', '/api/transcribe', );
    expect(res.status).toBe(400);
  });

  it('returns { text } for valid audio (DBB-002)', async () => {
    stt.transcribe.mockResolvedValue('hello world');
    const form = new FormData();
    form.append('audio', new Blob([Buffer.alloc(100)], { type: 'audio/wav' }), 'audio.wav');
    const res = await fetch(`${baseUrl}/api/transcribe`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe('hello world');
  });
});

// DBB-003: POST /api/synthesize
describe('POST /api/synthesize', () => {
  it('returns 400 when no text', async () => {
    const res = await req('POST', '/api/synthesize', {});
    expect(res.status).toBe(400);
  });

  it('returns audio/wav buffer (DBB-003)', async () => {
    tts.synthesize.mockResolvedValue(Buffer.from([0x52, 0x49, 0x46, 0x46]));
    const res = await req('POST', '/api/synthesize', { text: 'hello' });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\//);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });
});

// DBB-004: GET /api/status
describe('GET /api/status', () => {
  it('returns hardware, config, devices (DBB-004)', async () => {
    const res = await req('GET', '/api/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('hardware');
    expect(body).toHaveProperty('config');
    expect(body).toHaveProperty('devices');
  });
});

// DBB-005 & DBB-006: GET/PUT /api/config
describe('/api/config', () => {
  beforeEach(() => fs.rm(CONFIG_PATH, { force: true }).catch(() => {}));
  afterEach(() => fs.rm(CONFIG_PATH, { force: true }).catch(() => {}));
  it('GET returns 200 JSON (DBB-005)', async () => {
    const res = await req('GET', '/api/config');
    expect(res.status).toBe(200);
    expect(typeof await res.json()).toBe('object');
  });

  it('PUT persists, GET returns updated value (DBB-006)', async () => {
    const cfg = { model: 'llama3', theme: 'dark' };
    const put = await req('PUT', '/api/config', cfg);
    expect(put.status).toBe(200);
    const get = await req('GET', '/api/config');
    expect(await get.json()).toMatchObject(cfg);
  });

  afterEach(() => fs.rm(CONFIG_PATH, { force: true }).catch(() => {}));
});
