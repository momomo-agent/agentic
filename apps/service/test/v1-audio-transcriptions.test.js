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

describe('POST /v1/audio/transcriptions', () => {
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

  it('returns 400 when no file is uploaded', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
  });

  it('returns transcription in json format', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('fake-audio')], { type: 'audio/wav' }), 'audio.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.text).toBe('hello world');
  });

  it('returns verbose_json format when requested', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('fake-audio')], { type: 'audio/wav' }), 'audio.wav');
    form.append('response_format', 'verbose_json');
    form.append('language', 'zh');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.task).toBe('transcribe');
    expect(body.language).toBe('zh');
    expect(body.text).toBe('hello world');
    expect(body).toHaveProperty('duration');
    expect(body).toHaveProperty('segments');
  });

  it('returns 500 on transcribe failure', async () => {
    sttMod.transcribe.mockRejectedValueOnce(new Error('stt failed'));
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('fake-audio')], { type: 'audio/wav' }), 'audio.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.type).toBe('server_error');
  });
});
