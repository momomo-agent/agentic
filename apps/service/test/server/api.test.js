import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Mock chat before importing api
vi.mock('../../src/server/brain.js', () => ({
  chat: vi.fn(),
  registerTool: vi.fn(),
  chatSession: vi.fn()
}));

vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({
    platform: 'darwin', arch: 'arm64',
    gpu: { type: 'apple-silicon', vram: 16 },
    memory: 16, cpu: { cores: 10, model: 'Apple M4' }
  })
}));

import { chat } from '../../src/server/brain.js';
import { startServer } from '../../src/server/api.js';

const CONFIG_PATH = path.join(os.homedir(), '.agentic-service', 'config.json');

let server;
let baseUrl;

async function req(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`${baseUrl}${path}`, opts);
}

describe('HTTP Server', () => {
  beforeEach(async () => {
    const port = 3100 + Math.floor(Math.random() * 100);
    server = await startServer(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => server?.close());

  describe('POST /api/chat', () => {
    it('returns 400 for missing message', async () => {
      const res = await req('POST', '/api/chat', {});
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });

    it('returns 400 for non-string message', async () => {
      const res = await req('POST', '/api/chat', { message: 123 });
      expect(res.status).toBe(400);
    });

    it('returns SSE stream with content-type text/event-stream', async () => {
      chat.mockImplementation(async function* () {
        yield { type: 'content', content: 'Hello', done: false };
      });

      const res = await req('POST', '/api/chat', { message: 'Hi' });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/text\/event-stream/);
    });

    it('streams chunks in SSE format and ends with [DONE]', async () => {
      chat.mockImplementation(async function* () {
        yield { type: 'content', content: 'Hi', done: false };
        yield { type: 'content', content: '!', done: true };
      });

      const res = await req('POST', '/api/chat', { message: 'Hello' });
      const text = await res.text();
      expect(text).toContain('data: {"type":"content","content":"Hi"');
      expect(text).toContain('data: [DONE]');
    });

    it('passes history to chat function', async () => {
      chat.mockImplementation(async function* () {});
      const history = [{ role: 'user', content: 'prev' }];
      await req('POST', '/api/chat', { message: 'Hi', history });
      expect(chat).toHaveBeenCalledWith('Hi', { history });
    });

    it('writes error chunk on chat failure', async () => {
      chat.mockImplementation(async function* () {
        throw new Error('LLM failed');
      });

      const res = await req('POST', '/api/chat', { message: 'Hi' });
      const text = await res.text();
      expect(text).toContain('LLM failed');
    });
  });

  describe('GET /api/status', () => {
    it('returns hardware, profile, ollama fields', async () => {
      const res = await req('GET', '/api/status');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('hardware');
      expect(body).toHaveProperty('profile');
      expect(body).toHaveProperty('ollama');
      expect(body.ollama).toHaveProperty('running');
      expect(body.ollama).toHaveProperty('models');
    });

    it('hardware contains required fields', async () => {
      const res = await req('GET', '/api/status');
      const { hardware } = await res.json();
      expect(hardware).toHaveProperty('platform');
      expect(hardware).toHaveProperty('arch');
      expect(hardware).toHaveProperty('gpu');
      expect(hardware).toHaveProperty('memory');
      expect(hardware).toHaveProperty('cpu');
    });

    it('ollama.running is boolean (not hardcoded)', async () => {
      const res = await req('GET', '/api/status');
      const { ollama } = await res.json();
      expect(typeof ollama.running).toBe('boolean');
      expect(Array.isArray(ollama.models)).toBe(true);
    });
  });

  describe('GET /api/config', () => {
    it('returns 200 with object', async () => {
      const res = await req('GET', '/api/config');
      expect(res.status).toBe(200);
      expect(typeof await res.json()).toBe('object');
    });

    it('returns {} when config file does not exist', async () => {
      await fs.rm(CONFIG_PATH, { force: true });
      const res = await req('GET', '/api/config');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({});
    });
  });

  describe('PUT /api/config', () => {
    it('returns { ok: true } on success', async () => {
      const res = await req('PUT', '/api/config', { model: 'llama3' });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it('persists config: GET returns what was PUT', async () => {
      const config = { llm: { model: 'llama3' }, theme: 'dark' };
      await req('PUT', '/api/config', config);
      const res = await req('GET', '/api/config');
      expect(await res.json()).toEqual(config);
    });
  });

  describe('startServer', () => {
    it('resolves with a server instance', async () => {
      const port = 3299;
      const s = await startServer(port);
      expect(s).toBeDefined();
      expect(typeof s.close).toBe('function');
      s.close();
    });
  });
});
