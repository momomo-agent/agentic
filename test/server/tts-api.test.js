import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('agentic-voice', () => ({ createTTS: vi.fn() }));
vi.mock('../../src/runtime/llm.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('multer', () => {
  const multer = () => ({ single: () => (req, res, next) => next() });
  multer.memoryStorage = () => ({});
  return { default: multer };
});

const mockSynthesize = vi.fn();
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: (...args) => mockSynthesize(...args) }));

describe('POST /api/synthesize', () => {
  let server, baseUrl;

  beforeEach(async () => {
    mockSynthesize.mockReset();
    const { startServer } = await import('../../src/server/api.js');
    const port = 3400 + Math.floor(Math.random() * 100);
    server = await startServer(port);
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => server?.close());

  it('returns 400 when no text', async () => {
    const res = await fetch(`${baseUrl}/api/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    expect(res.status).toBe(400);
  });

  it('returns audio/wav for valid text', async () => {
    mockSynthesize.mockResolvedValue(Buffer.from('wav-data'));
    const res = await fetch(`${baseUrl}/api/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' })
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('audio/wav');
  });

  it('returns 500 when provider throws', async () => {
    mockSynthesize.mockRejectedValue(new Error('provider down'));
    const res = await fetch(`${baseUrl}/api/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'hello' })
    });
    expect(res.status).toBe(500);
  });
});
