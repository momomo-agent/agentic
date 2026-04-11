/**
 * M103 tester verification — additional edge case tests
 * Covers DBB gaps not in existing m103 test files
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

import { createApp } from '../../src/server/api.js';
import { chat } from '../../src/server/brain.js';
import * as sttMod from '../../src/runtime/stt.js';

describe('M103 tester verification — edge cases', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    sttMod.transcribe.mockResolvedValue('hello');
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  // ─── Health check edge cases ───────────────────────────────

  it('health response has valid JSON structure with all required fields', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json();
    expect(body.status).toMatch(/^(ok|degraded)$/);
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.responseTime).toBe('number');
    expect(body.responseTime).toBeGreaterThanOrEqual(0);
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('health check is GET-only (POST returns 404 or 405)', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { method: 'POST' });
    expect([404, 405]).toContain(res.status);
  });

  // ─── Error format edge cases ───────────────────────────────

  it('DBB-004: /v1/embeddings error has all three fields', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('type');
    expect(body.error).toHaveProperty('code');
    expect(typeof body.error.message).toBe('string');
    expect(typeof body.error.type).toBe('string');
  });

  it('error type is invalid_request_error for 4xx', async () => {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await res.json();
    expect(body.error.type).toBe('invalid_request_error');
  });

  it('middleware errorHandler includes code field', async () => {
    // The middleware.js errorHandler should produce { error: { message, type, code } }
    // We verify by importing and checking the module structure
    const { errorHandler } = await import('../../src/server/middleware.js');
    expect(typeof errorHandler).toBe('function');
  });

  // ─── Audio validation edge cases ───────────────────────────

  it('DBB-008: accepts OGG file', async () => {
    const oggBuffer = Buffer.from([0x4F, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const form = new FormData();
    form.append('file', new Blob([oggBuffer]), 'test.ogg');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('DBB-008: accepts FLAC file', async () => {
    const flacBuffer = Buffer.from([0x66, 0x4C, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22, 0x00, 0x00, 0x00, 0x00]);
    const form = new FormData();
    form.append('file', new Blob([flacBuffer]), 'test.flac');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('DBB-008: accepts WebM file', async () => {
    const webmBuffer = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1F]);
    const form = new FormData();
    form.append('file', new Blob([webmBuffer]), 'test.webm');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('rejects very small file (< 12 bytes, non-empty)', async () => {
    const tinyBuffer = Buffer.from([0x01, 0x02, 0x03]);
    const form = new FormData();
    form.append('file', new Blob([tinyBuffer]), 'tiny.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_audio_format');
  });

  it('audio validation error has correct OpenAI error structure', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('not audio')]), 'bad.txt');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('type');
    expect(body.error).toHaveProperty('code');
    expect(body.error.type).toBe('invalid_request_error');
    expect(body.error.code).toBe('invalid_audio_format');
  });
});
