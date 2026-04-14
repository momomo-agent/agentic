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
vi.mock('../src/engine/registry.js', async (importOriginal) => {
  const orig = await importOriginal();
  return {
    ...orig,
    modelsForCapability: vi.fn().mockResolvedValue([]),
  };
});

import { createApp } from '../src/server/api.js';
import { chat } from '../src/server/core-bridge.js';
import { embed } from '../src/runtime/embed.js';
import * as sttMod from '../src/runtime/stt.js';
import * as ttsMod from '../src/runtime/tts.js';
import { modelsForCapability } from '../src/engine/registry.js';

describe('M102 DBB Comprehensive Tests', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {
      yield { type: 'content', content: 'test response' };
    });
    embed.mockResolvedValue([0.1, 0.2, 0.3]);
    sttMod.transcribe.mockResolvedValue('hello world');
    ttsMod.synthesize.mockResolvedValue(Buffer.from('fake-audio-data'));
    modelsForCapability.mockResolvedValue([]);
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  // ─── DBB-006: nonexistent model for embeddings ──────────────
  describe('DBB-006: embedding with nonexistent model', () => {
    it('returns 4xx or 5xx with error, not crash', async () => {
      embed.mockRejectedValueOnce(new Error('model not found'));
      const res = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nonexistent-model', input: 'test' })
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('message');
    });
  });

  // ─── DBB-007: OpenAI SDK compatibility — embeddings response schema ──
  describe('DBB-007: embeddings response matches OpenAI schema', () => {
    it('response has all required OpenAI Embedding fields', async () => {
      const res = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'bge-m3', input: 'hello' })
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      // Top-level fields
      expect(body.object).toBe('list');
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.model).toBe('string');
      expect(body.usage).toHaveProperty('prompt_tokens');
      expect(body.usage).toHaveProperty('total_tokens');
      // Data item fields
      const item = body.data[0];
      expect(item.object).toBe('embedding');
      expect(Array.isArray(item.embedding)).toBe(true);
      expect(typeof item.index).toBe('number');
      // Embedding values are floats
      for (const v of item.embedding) {
        expect(typeof v).toBe('number');
      }
    });
  });

  // ─── DBB-014: speech missing model still works ──────────────
  describe('DBB-014: speech with missing model', () => {
    it('returns audio even without model param', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'hello' })
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/audio/);
    });
  });

  // ─── DBB-015: speech missing input ──────────────
  describe('DBB-015: speech missing input', () => {
    it('returns 400 with error mentioning input', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1' })
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.message).toMatch(/input/i);
    });
  });

  // ─── DBB-016: speech with all params ──────────────
  describe('DBB-016: speech with all params', () => {
    it('accepts model, input, voice, response_format, speed', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: 'hello', voice: 'alloy', response_format: 'wav', speed: 1.0 })
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/audio\/wav/);
    });
  });

  // ─── DBB-017: speech flac format ──────────────
  describe('DBB-017: speech flac format', () => {
    it('returns flac content type', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'hello', response_format: 'flac' })
      });
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toMatch(/audio\/flac/);
    });
  });

  // ─── DBB-018: speech engine failure ──────────────
  describe('DBB-018: speech engine failure', () => {
    it('returns error JSON, not crash', async () => {
      ttsMod.synthesize.mockRejectedValueOnce(new Error('engine unavailable'));
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'hello' })
      });
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('type');
    });
  });

  // ─── DBB-022: models list includes embedding models ──────────────
  describe('DBB-022: models list includes embedding models', () => {
    it('lists embedding models from registry', async () => {
      modelsForCapability.mockImplementation(async (cap) => {
        if (cap === 'embed') return [{ id: 'bge-m3', engineId: 'ollama' }];
        return [];
      });
      const res = await fetch(`${baseUrl}/v1/models`);
      const body = await res.json();
      const ids = body.data.map(m => m.id);
      expect(ids).toContain('bge-m3');
    });
  });

  // ─── DBB-023: models list includes audio models ──────────────
  describe('DBB-023: models list includes audio models', () => {
    it('lists STT and TTS models from registry', async () => {
      modelsForCapability.mockImplementation(async (cap) => {
        if (cap === 'stt') return [{ id: 'whisper:small', engineId: 'whisper' }];
        if (cap === 'tts') return [{ id: 'kokoro:default', engineId: 'kokoro' }];
        return [];
      });
      const res = await fetch(`${baseUrl}/v1/models`);
      const body = await res.json();
      const ids = body.data.map(m => m.id);
      expect(ids).toContain('whisper:small');
      expect(ids).toContain('kokoro:default');
    });
  });

  // ─── DBB-024: models response format matches OpenAI ──────────────
  describe('DBB-024: models response format', () => {
    it('every model has id, object=model, created, owned_by', async () => {
      modelsForCapability.mockImplementation(async (cap) => {
        if (cap === 'embed') return [{ id: 'bge-m3', engineId: 'ollama' }];
        return [];
      });
      const res = await fetch(`${baseUrl}/v1/models`);
      const body = await res.json();
      expect(body.object).toBe('list');
      for (const model of body.data) {
        expect(typeof model.id).toBe('string');
        expect(model.object).toBe('model');
        expect(typeof model.created).toBe('number');
        expect(typeof model.owned_by).toBe('string');
      }
    });
  });

  // ─── DBB-025: all new endpoints return JSON error format ──────────────
  describe('DBB-025: unified JSON error format', () => {
    it('embeddings error has error.message and error.type', async () => {
      const res = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('type');
    });

    it('transcriptions error has error.message and error.type', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('type');
    });

    it('speech error has error.message and error.type', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toHaveProperty('message');
      expect(body.error).toHaveProperty('type');
    });
  });

  // ─── DBB-026: POST endpoints reject GET ──────────────
  describe('DBB-026: POST endpoints reject GET', () => {
    it('GET /v1/embeddings returns non-200', async () => {
      const res = await fetch(`${baseUrl}/v1/embeddings`);
      expect(res.status).not.toBe(200);
    });

    it('GET /v1/audio/transcriptions returns non-200', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/transcriptions`);
      expect(res.status).not.toBe(200);
    });

    it('GET /v1/audio/speech returns non-200', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`);
      expect(res.status).not.toBe(200);
    });
  });

  // ─── DBB-027: chat completions no regression ──────────────
  describe('DBB-027: chat completions still works', () => {
    it('POST /v1/chat/completions returns valid response', async () => {
      const res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.object).toBe('chat.completion');
      expect(body.choices).toHaveLength(1);
      expect(body.choices[0].message).toHaveProperty('content');
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

  // ─── DBB-008: basic transcription returns text ──────────────
  describe('DBB-008: basic transcription', () => {
    it('returns { text } for valid audio', async () => {
      const form = new FormData();
      form.append('file', new Blob([Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20])], { type: 'audio/wav' }), 'audio.wav');
      const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: form,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(typeof body.text).toBe('string');
      expect(body.text.length).toBeGreaterThan(0);
    });
  });

  // ─── DBB-013: transcription SDK compatibility ──────────────
  describe('DBB-013: transcription response matches OpenAI schema', () => {
    it('json format returns only text field', async () => {
      const form = new FormData();
      form.append('file', new Blob([Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20])], { type: 'audio/wav' }), 'audio.wav');
      const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
        method: 'POST',
        body: form,
      });
      const body = await res.json();
      expect(body).toHaveProperty('text');
    });
  });

  // ─── DBB-019: speech SDK compatibility ──────────────
  describe('DBB-019: speech returns audio binary', () => {
    it('response body is non-empty binary', async () => {
      const res = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: 'hello', voice: 'alloy' })
      });
      expect(res.status).toBe(200);
      const buf = await res.arrayBuffer();
      expect(buf.byteLength).toBeGreaterThan(0);
    });
  });

  // ─── DBB-020/021: models endpoint basics ──────────────
  describe('DBB-020/021: models endpoint', () => {
    it('GET /v1/models returns list with base model', async () => {
      const res = await fetch(`${baseUrl}/v1/models`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.object).toBe('list');
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].id).toBe('agentic-service');
    });
  });
});
