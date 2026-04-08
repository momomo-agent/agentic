import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';

vi.mock('../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../src/runtime/stt.js', () => ({ transcribe: vi.fn(), init: vi.fn().mockResolvedValue() }));
vi.mock('../src/runtime/tts.js', () => ({ synthesize: vi.fn(), init: vi.fn().mockResolvedValue() }));

import { startServer, stopServer } from '../src/server/api.js';

let server, baseUrl;

beforeEach(async () => {
  const port = 3500 + Math.floor(Math.random() * 100);
  server = await startServer(port);
  baseUrl = `http://localhost:${port}`;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await stopServer(server);
});

describe('POST /api/transcribe invalid format', () => {
  it('returns 400 when no audio file', async () => {
    const res = await fetch(`${baseUrl}/api/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: 'bad' })
    });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/config disk write failure', () => {
  it('returns 500 on write error', async () => {
    vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('disk full'));
    const res = await fetch(`${baseUrl}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ llm: {} })
    });
    expect(res.status).toBe(500);
  });
});
