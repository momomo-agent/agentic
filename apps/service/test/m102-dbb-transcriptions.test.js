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
import * as sttMod from '../src/runtime/stt.js';

describe('M102 DBB — /v1/audio/transcriptions', () => {
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

  // DBB-008: basic transcription
  it('DBB-008: basic WAV transcription returns text', async () => {
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

  // DBB-009: model and language params
  it('DBB-009: accepts model and language params', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20])], { type: 'audio/wav' }), 'audio.wav');
    form.append('model', 'whisper');
    form.append('language', 'en');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('text');
  });

  // DBB-010: verbose_json format
  it('DBB-010: verbose_json returns task, language, duration, text, segments', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20])], { type: 'audio/wav' }), 'audio.wav');
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
  });

  // DBB-011: missing file
  it('DBB-011: missing file returns 400 mentioning file', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toMatch(/file/i);
  });

  // DBB-025: error response format
  it('DBB-025: error responses are JSON with error.message and error.type', async () => {
    sttMod.transcribe.mockRejectedValueOnce(new Error('stt failed'));
    const form = new FormData();
    form.append('file', new Blob([Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20])], { type: 'audio/wav' }), 'audio.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      body: form,
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(typeof body.error.message).toBe('string');
    expect(typeof body.error.type).toBe('string');
  });

  // DBB-026: GET request to POST endpoint
  it('DBB-026: GET /v1/audio/transcriptions returns non-200', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`);
    expect(res.status).not.toBe(200);
  });
});
