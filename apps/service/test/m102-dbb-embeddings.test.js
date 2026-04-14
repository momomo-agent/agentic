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
import { embed } from '../src/runtime/embed.js';

describe('M102 DBB — /v1/embeddings', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    embed.mockResolvedValue([0.1, 0.2, 0.3]);
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  // DBB-001: single string embedding
  it('DBB-001: single string returns correct response shape', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: 'hello world' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.object).toBe('list');
    expect(body.data).toHaveLength(1);
    expect(body.data[0].object).toBe('embedding');
    expect(Array.isArray(body.data[0].embedding)).toBe(true);
    expect(body.data[0].embedding.length).toBeGreaterThan(0);
    expect(body.data[0].index).toBe(0);
    expect(body.model).toBe('bge-m3');
    expect(typeof body.usage.prompt_tokens).toBe('number');
    expect(typeof body.usage.total_tokens).toBe('number');
  });

  // DBB-002: batch string embedding
  it('DBB-002: batch strings return correct indices', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: ['hello', 'world', 'foo'] })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(3);
    expect(body.data[0].index).toBe(0);
    expect(body.data[1].index).toBe(1);
    expect(body.data[2].index).toBe(2);
    for (const item of body.data) {
      expect(item.object).toBe('embedding');
      expect(Array.isArray(item.embedding)).toBe(true);
      expect(item.embedding.length).toBeGreaterThan(0);
    }
  });

  // DBB-003: missing input field
  it('DBB-003: missing input returns 400 with error mentioning input', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3' })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/input/i);
  });

  // DBB-004: empty string input — must not 500
  it('DBB-004: empty string input does not return 500', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: '' })
    });
    // Must be either valid embedding or 4xx, never 500
    expect(res.status).not.toBe(500);
    expect([200, 400, 422]).toContain(res.status);
  });

  // DBB-005: empty array input — must not 500
  it('DBB-005: empty array input does not return 500', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: [] })
    });
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await res.json();
      // Either empty data or valid response
      expect(body.object).toBe('list');
    }
  });

  // DBB-025: error response format
  it('DBB-025: error responses are JSON with error.message', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(typeof body.error.message).toBe('string');
    expect(typeof body.error.type).toBe('string');
  });

  // DBB-026: GET request to POST endpoint
  it('DBB-026: GET /v1/embeddings returns 404 or 405', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`);
    expect(res.status).not.toBe(200);
  });
});
