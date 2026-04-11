/**
 * OpenAI error format tests for task-1775893487814 (M103)
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

describe('OpenAI-compatible error format — code field', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetAllMocks();
    chat.mockImplementation(async function* () {});
    await new Promise((resolve, reject) => {
      server = createApp().listen(0);
      server.once('listening', () => { baseUrl = `http://localhost:${server.address().port}`; resolve(); });
      server.once('error', reject);
    });
  });

  afterEach(() => new Promise(r => server.close(r)));

  it('DBB-004: POST /v1/chat/completions with empty body has error.code', async () => {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toHaveProperty('message');
    expect(body.error).toHaveProperty('type');
    expect(body.error).toHaveProperty('code');
  });

  it('DBB-006: POST /v1/chat/completions with no messages returns correct format', async () => {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] })
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toEqual({
      message: 'No messages provided',
      type: 'invalid_request_error',
      code: 'missing_required_field'
    });
  });

  it('POST /v1/audio/transcriptions with no file has error.code', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/transcriptions`, {
      method: 'POST'
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error.type).toBe('invalid_request_error');
  });

  it('POST /v1/audio/speech with no input has error.code', async () => {
    const res = await fetch(`${baseUrl}/v1/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error.code).toBe('missing_required_field');
  });

  it('POST /v1/embeddings with no input has error.code', async () => {
    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toHaveProperty('code');
    expect(body.error.code).toBe('missing_required_field');
  });
});
