/**
 * Audio format validation tests for task-1775893487853 (M103)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

import { createApp } from '../../src/server/api.js';
import * as sttMod from '../../src/runtime/stt.js';

describe('Audio format validation — /v1/audio/transcriptions', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    sttMod.transcribe.mockResolvedValue('hello world');
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  it('DBB-007: rejects text file with 400', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('this is plain text, not audio')]), 'test.txt');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_audio_format');
    expect(body.error.type).toBe('invalid_request_error');
  });

  it('DBB-008: accepts valid WAV file', async () => {
    // Minimal WAV header: RIFF + size + WAVE + fmt
    const wavBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46,  // RIFF
      0x24, 0x00, 0x00, 0x00,  // chunk size
      0x57, 0x41, 0x56, 0x45,  // WAVE
      0x66, 0x6D, 0x74, 0x20,  // fmt
    ]);
    const form = new FormData();
    form.append('file', new Blob([wavBuffer]), 'test.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('text');
  });

  it('DBB-008: accepts valid MP3 file (ID3 tag)', async () => {
    const mp3Buffer = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const form = new FormData();
    form.append('file', new Blob([mp3Buffer]), 'test.mp3');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('DBB-009: rejects empty file with 400', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.alloc(0)]), 'empty.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_audio_format');
  });

  it('rejects random binary with 400', async () => {
    const randomBytes = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    const form = new FormData();
    form.append('file', new Blob([randomBytes]), 'random.bin');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_audio_format');
  });
});
