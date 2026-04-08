import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('agentic-voice/sensevoice', () => ({ transcribe: vi.fn(async () => 'hello world') }));
vi.mock('agentic-voice/openai-whisper', () => ({ transcribe: vi.fn(async () => 'fallback') }));
vi.mock('agentic-voice/kokoro', () => ({ synthesize: vi.fn(async () => Buffer.from('audio')) }));
vi.mock('agentic-voice/openai-tts', () => ({ synthesize: vi.fn(async () => Buffer.from('tts-fallback')) }));
vi.mock('../../src/detector/profiles.js', () => ({
  getProfile: vi.fn(async () => ({ stt: { provider: 'sensevoice' }, tts: { provider: 'kokoro' } })),
}));

describe('M27 DBB-001: stt transcribe returns string', () => {
  beforeEach(() => vi.resetModules());

  it('returns non-empty string for valid buffer', async () => {
    const { init, transcribe } = await import('../src/runtime/stt.js');
    await init();
    const result = await transcribe(Buffer.from('audio data'));
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('M27 DBB-002: stt transcribe empty buffer throws EMPTY_AUDIO', () => {
  beforeEach(() => vi.resetModules());

  it('throws EMPTY_AUDIO for empty buffer', async () => {
    const { init, transcribe } = await import('../src/runtime/stt.js');
    await init();
    await expect(transcribe(Buffer.alloc(0))).rejects.toMatchObject({ code: 'EMPTY_AUDIO' });
  });

  it('throws not initialized if init not called', async () => {
    const { transcribe } = await import('../src/runtime/stt.js');
    await expect(transcribe(Buffer.from('x'))).rejects.toThrow('not initialized');
  });
});

describe('M27 DBB-003: tts synthesize returns Buffer', () => {
  beforeEach(() => vi.resetModules());

  it('returns Buffer for valid text', async () => {
    const { init, synthesize } = await import('../src/runtime/tts.js');
    await init();
    const result = await synthesize('hello');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('M27 DBB-004: tts synthesize empty text throws EMPTY_TEXT', () => {
  beforeEach(() => vi.resetModules());

  it('throws EMPTY_TEXT for empty string', async () => {
    const { init, synthesize } = await import('../src/runtime/tts.js');
    await init();
    await expect(synthesize('')).rejects.toMatchObject({ code: 'EMPTY_TEXT' });
  });

  it('throws EMPTY_TEXT for whitespace-only string', async () => {
    const { init, synthesize } = await import('../src/runtime/tts.js');
    await init();
    await expect(synthesize('   ')).rejects.toMatchObject({ code: 'EMPTY_TEXT' });
  });

  it('throws not initialized if init not called', async () => {
    const { synthesize } = await import('../src/runtime/tts.js');
    await expect(synthesize('hello')).rejects.toThrow('not initialized');
  });
});
