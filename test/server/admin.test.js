import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('agentic-voice', () => ({ createSTT: vi.fn(), createTTS: vi.fn() }));
vi.mock('../../src/runtime/llm.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('multer', () => {
  const multer = () => ({ single: () => (req, res, next) => next() });
  multer.memoryStorage = () => ({});
  return { default: multer };
});

describe('GET /api/logs', () => {
  let server, baseUrl;

  beforeEach(async () => {
    vi.resetModules();
    const { startServer } = await import('../../src/server/api.js');
    const port = 3500 + Math.floor(Math.random() * 100);
    server = await startServer(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => server?.close());

  it('returns an array', async () => {
    const res = await fetch(`${baseUrl}/api/logs`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('each entry has ts (number) and msg (string)', async () => {
    // trigger a log entry
    console.log('test-log-entry');
    const res = await fetch(`${baseUrl}/api/logs`);
    const body = await res.json();
    if (body.length > 0) {
      expect(typeof body[0].ts).toBe('number');
      expect(typeof body[0].msg).toBe('string');
    }
  });

  it('returns at most 50 entries', async () => {
    const res = await fetch(`${baseUrl}/api/logs`);
    const body = await res.json();
    expect(body.length).toBeLessThanOrEqual(50);
  });
});
