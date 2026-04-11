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
import * as sttMod from '../src/runtime/stt.js';

describe('POST /v1/audio/transcriptions — DBB edge cases', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    sttMod.transcribe.mockResolvedValue('hello world');
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  // DBB-009: model and language params accepted
  it('DBB-009: accepts model and language params', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('fake-audio')], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', 'whisper');
    form.append('language', 'en');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('text');
    expect(typeof body.text).toBe('string');
  });

  // DBB-010: verbose_json has all required fields
  it('DBB-010: verbose_json has task, language, duration, text, segments', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('fake-audio')], { type: 'audio/wav' }), 'audio.wav');
    form.append('response_format', 'verbose_json');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('task');
    expect(body).toHaveProperty('language');
    expect(body).toHaveProperty('duration');
    expect(body).toHaveProperty('text');
    expect(body).toHaveProperty('segments');
    expect(Array.isArray(body.segments)).toBe(true);
  });

  // DBB-011: no file returns 400 with error mentioning "file"
  it('DBB-011: no file returns 400 with error mentioning file', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/file/i);
  });

  // DBB-012: invalid file format — must not 500 (depends on stt impl, but error should be caught)
  it('DBB-012: invalid audio triggers error, not unhandled crash', async () => {
    sttMod.transcribe.mockRejectedValueOnce(new Error('invalid audio format'));
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('not-real-audio')], { type: 'text/plain' }), 'fake.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    // Should be caught and returned as error JSON, not crash
    expect(res.status).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });
});
