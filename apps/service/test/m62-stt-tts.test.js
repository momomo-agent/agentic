import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('agentic-voice package integration — stt.js + tts.js', () => {
  beforeEach(() => { vi.resetModules(); });

  it('stt init() resolves without throwing (default adapter)', async () => {
    vi.doMock('agentic-voice/openai-whisper', () => ({ transcribe: async () => 'hello' }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const { init } = await import('../src/runtime/stt.js');
    await expect(init()).resolves.not.toThrow();
  });

  it('tts init() resolves without throwing (default adapter)', async () => {
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.from('audio') }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const { init } = await import('../src/runtime/tts.js');
    await expect(init()).resolves.not.toThrow();
  });

  it('transcribe returns string after init', async () => {
    vi.doMock('agentic-voice/openai-whisper', () => ({ transcribe: async () => 'test text' }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const stt = await import('../src/runtime/stt.js');
    await stt.init();
    const result = await stt.transcribe(Buffer.from('audio'));
    expect(typeof result).toBe('string');
  });

  it('synthesize returns Buffer after init', async () => {
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.from('mp3data') }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const tts = await import('../src/runtime/tts.js');
    await tts.init();
    const result = await tts.synthesize('hello');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('transcribe throws EMPTY_AUDIO for empty buffer', async () => {
    vi.doMock('agentic-voice/openai-whisper', () => ({ transcribe: async () => '' }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const stt = await import('../src/runtime/stt.js');
    await stt.init();
    await expect(stt.transcribe(Buffer.alloc(0))).rejects.toMatchObject({ code: 'EMPTY_AUDIO' });
  });

  it('synthesize throws EMPTY_TEXT for blank text', async () => {
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.alloc(0) }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const tts = await import('../src/runtime/tts.js');
    await tts.init();
    await expect(tts.synthesize('   ')).rejects.toMatchObject({ code: 'EMPTY_TEXT' });
  });

  it('openai-whisper throws NO_API_KEY when OPENAI_API_KEY missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const { transcribe } = await import('../src/runtime/adapters/voice/openai-whisper.js');
    await expect(transcribe(Buffer.from('x'))).rejects.toMatchObject({ code: 'NO_API_KEY' });
  });

  it('openai-tts throws NO_API_KEY when OPENAI_API_KEY missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const { synthesize } = await import('../src/runtime/adapters/voice/openai-tts.js');
    await expect(synthesize('hello')).rejects.toMatchObject({ code: 'NO_API_KEY' });
  });
});
