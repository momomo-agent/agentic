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

describe('POST /v1/embeddings — DBB edge cases', () => {
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

  // DBB-002: batch of 3 strings with correct indices
  it('DBB-002: batch of 3 strings returns correct indices', async () => {
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

  // DBB-003: missing input field (with model only)
  it('DBB-003: missing input with model returns 400', async () => {
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
  it('DBB-004: empty string input does not 500', async () => {
    embed.mockResolvedValue([]);
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: '' })
    });
    // Must be either valid embedding or 4xx, never 500
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.object).toBe('list');
      expect(body.data).toHaveLength(1);
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });

  // DBB-005: empty array input — must not 500
  it('DBB-005: empty array input does not 500', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: [] })
    });
    expect(res.status).not.toBe(500);
    if (res.status === 200) {
      const body = await res.json();
      expect(body.data).toEqual([]);
    } else {
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });

  // DBB-001: verify usage fields are integers
  it('DBB-001: usage fields are integers', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'bge-m3', input: 'hello world' })
    });
    const body = await res.json();
    expect(Number.isInteger(body.usage.prompt_tokens)).toBe(true);
    expect(Number.isInteger(body.usage.total_tokens)).toBe(true);
  });
});
