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

describe('POST /v1/embeddings', () => {
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

  it('returns 400 when input is missing', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.type).toBe('invalid_request_error');
  });

  it('returns embedding for a single string input', async () => {
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
    expect(body.data[0].embedding).toEqual([0.1, 0.2, 0.3]);
    expect(body.data[0].index).toBe(0);
    expect(body.model).toBe('bge-m3');
    expect(body.usage).toHaveProperty('prompt_tokens');
    expect(body.usage).toHaveProperty('total_tokens');
  });

  it('returns embeddings for an array of strings', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: ['hello', 'world'] })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].index).toBe(0);
    expect(body.data[1].index).toBe(1);
    expect(embed).toHaveBeenCalledTimes(2);
  });

  it('returns 500 on embed failure', async () => {
    embed.mockRejectedValueOnce(new Error('embed failed'));
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'test' })
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.type).toBe('server_error');
  });
});
