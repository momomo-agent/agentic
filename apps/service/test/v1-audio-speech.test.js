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

describe('POST /v1/audio/speech', () => {
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

  it('returns 400 when input is missing', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.type).toBe('invalid_request_error');
  });

  it('returns audio with default mp3 content type', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: 'hello', voice: 'alloy' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/mpeg/);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  it('returns audio with wav content type when requested', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello', response_format: 'wav' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/wav/);
  });

  it('returns audio with opus content type when requested', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello', response_format: 'opus' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/opus/);
  });

  it('returns 500 on synthesize failure', async () => {
    ttsMod.synthesize.mockRejectedValueOnce(new Error('tts failed'));
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello' })
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.type).toBe('server_error');
  });
});
