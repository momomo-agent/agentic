import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('../src/runtime/embed.js', () => ({ embed: vi.fn() }));

import { createApp } from '../src/server/api.js';
import { chat } from '../src/server/brain.js';
import * as ttsMod from '../src/runtime/tts.js';

describe('M102 DBB — /v1/audio/speech', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    ttsMod.synthesize.mockResolvedValue(Buffer.from('fake-audio-data'));
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  // DBB-014: basic speech synthesis
  it('DBB-014: basic speech returns audio binary', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: 'hello world', voice: 'alloy' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio/);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  // DBB-015: voice parameter accepted
  it('DBB-015: voice parameter is accepted', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: 'hello', voice: 'shimmer' })
    });
    expect(res.status).toBe(200);
  });

  // DBB-016: response_format wav
  it('DBB-016: wav format returns audio/wav content type', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello', response_format: 'wav' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/wav/);
  });

  // DBB-017: response_format opus
  it('DBB-017: opus format returns audio/opus content type', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello', response_format: 'opus' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/opus/);
  });

  // DBB-018: missing input
  it('DBB-018: missing input returns 400', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: 'alloy' })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/input/i);
  });

  // DBB-019: synthesize failure returns 500 with error format
  it('DBB-019: synthesize failure returns 500 with OpenAI error format', async () => {
    ttsMod.synthesize.mockRejectedValueOnce(new Error('tts engine down'));
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello' })
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.type).toBe('server_error');
    expect(typeof body.error.message).toBe('string');
  });

  // DBB-025: error response format
  it('DBB-025: error responses have error.message field', async () => {
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

  // DBB-026: GET request to POST endpoint
  it('DBB-026: GET /v1/audio/speech returns non-200', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`);
    expect(res.status).not.toBe(200);
  });

  // Default format is mp3
  it('default response_format is mp3', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/mpeg/);
  });
});
