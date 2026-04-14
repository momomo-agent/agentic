import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/server/core-bridge.js', () => ({ chat: vi.fn() }));
vi.mock('../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('../src/runtime/embed.js', () => ({ embed: vi.fn() }));

import { createApp } from '../src/server/api.js';
import { chat } from '../src/server/core-bridge.js';
import * as ttsMod from '../src/runtime/tts.js';

describe('POST /v1/audio/speech — DBB edge cases', () => {
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

  // DBB-016: flac content type
  it('DBB-016: returns audio/flac when response_format=flac', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello', response_format: 'flac' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/audio\/flac/);
  });

  // DBB-014: input missing returns 400 with error.message mentioning input
  it('DBB-014: missing input error mentions input', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: 'alloy' })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/input/i);
  });

  // DBB-015: audio response body is non-empty
  it('DBB-015: audio response body is non-empty buffer', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', input: 'test speech', voice: 'alloy' })
    });
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(0);
  });

  // DBB-017: speed parameter accepted without error
  it('DBB-017: speed parameter accepted', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello', speed: 1.5 })
    });
    expect(res.status).toBe(200);
  });
});
