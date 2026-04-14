import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/server/core-bridge.js', () => ({ chat: vi.fn() }));
vi.mock('../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('../src/runtime/embed.js', () => ({
  embed: vi.fn().mockResolvedValue([0.1, 0.2, 0.3])
}));

import { createApp } from '../src/server/api.js';
import { chat } from '../src/server/core-bridge.js';

describe('Cross-functional DBB tests', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {
      yield { type: 'content', content: 'test response' };
    });
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  // DBB-025: error responses are JSON with error.message
  describe('DBB-025: JSON error format', () => {
    it('embeddings error is JSON with error.message', async () => {
      const res = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(typeof body.error.message).toBe('string');
    });

    it('transcriptions error is JSON with error.message', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(typeof body.error.message).toBe('string');
    });

    it('speech error is JSON with error.message', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(typeof body.error.message).toBe('string');
    });
  });

  // DBB-026: GET on POST-only endpoints should not return 200
  describe('DBB-026: GET on POST endpoints', () => {
    it('GET /v1/embeddings does not return 200', async () => {
      const res = await fetch(`${baseUrl}/v1/embeddings`);
      expect(res.status).not.toBe(200);
    });

    it('GET /v1/audio/transcriptions does not return 200', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/transcriptions`);
      expect(res.status).not.toBe(200);
    });

    it('GET /v1/audio/speech does not return 200', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`);
      expect(res.status).not.toBe(200);
    });
  });

  // DBB-027: chat completions still works (no regression)
  describe('DBB-027: chat completions regression', () => {
    it('POST /v1/chat/completions returns valid response', async () => {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'hello' }],
          model: 'agentic-service'
        })
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.object).toBe('chat.completion');
      expect(body.choices).toHaveLength(1);
      expect(body.choices[0].message.role).toBe('assistant');
    });

    it('POST /v1/chat/completions returns 400 for empty messages', async () => {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [] })
      });
      expect(res.status).toBe(400);
    });
  });
});
