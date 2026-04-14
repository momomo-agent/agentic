/**
 * Comprehensive M103 tester verification — covers all DBB criteria + edge cases
 * Written by tester agent for tasks: task-1775893487734, task-1775893487814, task-1775893487853, task-1775893487774
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

vi.mock('../../src/server/core-bridge.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

import { createApp } from '../../src/server/api.js';
import { chat } from '../../src/server/core-bridge.js';
import * as sttMod from '../../src/runtime/stt.js';

// ─── Health Check (task-1775893487734) ───────────────────────────

describe('Health check — additional edge cases', () => {
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

  it('DBB-001: health response has uptime as a number', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json();
    expect(typeof body.uptime).toBe('number');
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('DBB-001: health response has responseTime as a number', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json();
    expect(typeof body.responseTime).toBe('number');
    expect(body.responseTime).toBeGreaterThanOrEqual(0);
  });

  it('simple /health liveness probe still works', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('health endpoint uses GET method only', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { method: 'POST' });
    // Express returns 404 for unmatched POST on a GET-only route
    expect(res.status).not.toBe(200);
  });
});

// ─── Error Format (task-1775893487814) ───────────────────────────

describe('Error format — additional edge cases', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () { throw new Error('test engine error'); });
    sttMod.transcribe.mockRejectedValue(new Error('stt engine error'));
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  it('DBB-004: server error on /v1/chat/completions has code field', async () => {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('type', 'server_error');
    expect(body.error).toHaveProperty('code');
  });

  it('DBB-004: server error on /v1/audio/transcriptions has code field', async () => {
    // Valid WAV to pass format validation, but STT mock throws
    const wavBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, 0x66, 0x6D, 0x74, 0x20,
    ]);
    const form = new FormData();
    form.append('file', new Blob([wavBuffer]), 'test.wav');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('type', 'server_error');
    expect(body.error).toHaveProperty('code');
  });

  it('error response code field is null for server errors', async () => {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] })
    });
    const body = await res.json();
    expect(body.error.code).toBeNull();
  });

  it('error response code field is a string for client errors', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const body = await res.json();
    expect(typeof body.error.code).toBe('string');
    expect(body.error.code.length).toBeGreaterThan(0);
  });
});

// ─── Audio Validation (task-1775893487853) ───────────────────────

describe('Audio validation — additional edge cases', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    sttMod.transcribe.mockResolvedValue('transcribed text');
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  it('DBB-008: accepts OGG format', async () => {
    const oggBuffer = Buffer.from([0x4F, 0x67, 0x67, 0x53, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    const form = new FormData();
    form.append('file', new Blob([oggBuffer]), 'test.ogg');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('DBB-008: accepts FLAC format', async () => {
    const flacBuffer = Buffer.from([0x66, 0x4C, 0x61, 0x43, 0x00, 0x00, 0x00, 0x22, 0x00, 0x00, 0x00, 0x00]);
    const form = new FormData();
    form.append('file', new Blob([flacBuffer]), 'test.flac');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('DBB-008: accepts WebM format', async () => {
    const webmBuffer = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x93, 0x42, 0x82, 0x88, 0x6D, 0x61, 0x74, 0x72]);
    const form = new FormData();
    form.append('file', new Blob([webmBuffer]), 'test.webm');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('DBB-008: accepts MP4/M4A format (ftyp at offset 4)', async () => {
    const mp4Buffer = Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]);
    const form = new FormData();
    form.append('file', new Blob([mp4Buffer]), 'test.m4a');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
  });

  it('DBB-007: rejects JPEG image with 400', async () => {
    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const form = new FormData();
    form.append('file', new Blob([jpegBuffer]), 'image.jpg');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('invalid_audio_format');
  });

  it('DBB-007: rejects PNG image with 400', async () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
    const form = new FormData();
    form.append('file', new Blob([pngBuffer]), 'image.png');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
  });

  it('DBB-009: rejects very small file (< 12 bytes, non-matching)', async () => {
    const tinyBuffer = Buffer.from([0x01, 0x02, 0x03]);
    const form = new FormData();
    form.append('file', new Blob([tinyBuffer]), 'tiny.bin');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    expect(res.status).toBe(400);
  });

  it('DBB-007: error response includes message, type, and code', async () => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.from('not audio')]), 'test.txt');
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, { method: 'POST', body: form });
    const body = await res.json();
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('type');
    expect(body.error).toHaveProperty('code');
    expect(body.error.message).toContain('audio format');
  });
});

// ─── ARCHITECTURE.md Cleanup (task-1775893487774) ────────────────

describe('ARCHITECTURE.md — stale reference check (DBB-010)', () => {
  const archPath = resolve(import.meta.dirname, '../../ARCHITECTURE.md');
  let content;

  it('can read ARCHITECTURE.md', () => {
    content = readFileSync(archPath, 'utf8');
    expect(content.length).toBeGreaterThan(0);
  });

  // DBB-010 says: no references to removed files/components
  // However, historical changelog entries that document deletions are acceptable
  // We check that there are no ACTIVE references (directory listings, API docs, component lists)
  // that imply these files still exist

  it('DBB-010: no active directory listing for memory.js', () => {
    content = readFileSync(archPath, 'utf8');
    const lines = content.split('\n');
    const activeRefs = lines.filter(line => {
      // Skip lines that explicitly say "deleted" or "removed"
      if (/已删除|removed|deleted/i.test(line)) return false;
      // Check for directory-style listing of memory.js
      return /memory\.js/.test(line) && /│|├|└|─/.test(line);
    });
    expect(activeRefs).toHaveLength(0);
  });

  it('DBB-010: no active component listing for ConfigPanel', () => {
    content = readFileSync(archPath, 'utf8');
    const lines = content.split('\n');
    const activeRefs = lines.filter(line => {
      if (/已删除|removed|deleted|死文件/i.test(line)) return false;
      return /ConfigPanel/.test(line) && /│|├|└|─|components/.test(line);
    });
    expect(activeRefs).toHaveLength(0);
  });

  it('DBB-010: no active view listing for LocalModelsView or CloudModelsView', () => {
    content = readFileSync(archPath, 'utf8');
    const lines = content.split('\n');
    const activeRefs = lines.filter(line => {
      if (/已删除|removed|deleted|死文件/i.test(line)) return false;
      return /(LocalModels|CloudModels)/.test(line) && /│|├|└|─|views/.test(line);
    });
    expect(activeRefs).toHaveLength(0);
  });
});
