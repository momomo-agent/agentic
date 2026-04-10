import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/runtime/llm.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));
vi.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        req.file = { buffer: Buffer.from('fake-audio'), mimetype: 'audio/wav' };
      }
      next();
    }
  });
  multer.memoryStorage = () => ({});
  return { default: multer };
});

const mockTranscribe = vi.fn();
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: (...args) => mockTranscribe(...args) }));

describe('POST /api/transcribe', () => {
  let server, baseUrl;

  beforeEach(async () => {
    mockTranscribe.mockReset();
    const { startServer } = await import('../../src/server/api.js');
    server = await startServer(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  afterEach(() => server?.close());

  it('returns 400 when no audio file', async () => {
    const res = await fetch(`${baseUrl}/api/transcribe`, { method: 'POST' });
    expect(res.status).toBe(400);
  });

  it('returns { text } for valid audio upload', async () => {
    mockTranscribe.mockResolvedValue('test transcript');
    const form = new FormData();
    form.append('audio', new Blob([Buffer.from('fake-audio')], { type: 'audio/wav' }), 'audio.wav');
    const res = await fetch(`${baseUrl}/api/transcribe`, { method: 'POST', body: form });
    expect(res.status).toBe(200);
    expect((await res.json()).text).toBe('test transcript');
  });

  it('returns 500 when provider throws', async () => {
    mockTranscribe.mockRejectedValue(new Error('provider down'));
    const form = new FormData();
    form.append('audio', new Blob([Buffer.from('data')], { type: 'audio/wav' }), 'audio.wav');
    const res = await fetch(`${baseUrl}/api/transcribe`, { method: 'POST', body: form });
    expect(res.status).toBe(500);
  });
});
