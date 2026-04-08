// M93: Verify agentic-voice STT/TTS resolves in test environment
// Covers task-1775583805854
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('M93 agentic-voice STT/TTS resolution', () => {
  beforeEach(() => { vi.resetModules(); });

  // --- STT tests ---

  it('stt.init() resolves with default adapter (openai-whisper)', async () => {
    vi.doMock('agentic-voice/openai-whisper', () => ({ transcribe: async () => 'text' }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({ stt: { provider: 'default' } }) }));
    const { init } = await import('../src/runtime/stt.js');
    await expect(init()).resolves.not.toThrow();
  });

  it('stt.transcribe(buffer) returns string after init', async () => {
    vi.doMock('agentic-voice/openai-whisper', () => ({ transcribe: async () => 'hello world' }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const stt = await import('../src/runtime/stt.js');
    await stt.init();
    const result = await stt.transcribe(Buffer.from('audio'));
    expect(typeof result).toBe('string');
    expect(result).toBe('hello world');
  });

  it('stt.transcribe throws EMPTY_AUDIO for empty buffer', async () => {
    vi.doMock('agentic-voice/openai-whisper', () => ({ transcribe: async () => 'text' }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const stt = await import('../src/runtime/stt.js');
    await stt.init();
    await expect(stt.transcribe(Buffer.alloc(0))).rejects.toMatchObject({ code: 'EMPTY_AUDIO' });
  });

  it('stt.transcribe throws "not initialized" before init()', async () => {
    const stt = await import('../src/runtime/stt.js');
    await expect(stt.transcribe(Buffer.from('x'))).rejects.toThrow('not initialized');
  });

  it('stt falls back to default adapter if configured provider import fails', async () => {
    // sensevoice import fails (missing module), but openai-whisper works
    vi.doMock('agentic-voice/sensevoice', () => { throw new Error('MODULE_NOT_FOUND'); });
    vi.doMock('agentic-voice/openai-whisper', () => ({ transcribe: async () => 'fallback-text' }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({ stt: { provider: 'sensevoice' } }) }));
    const stt = await import('../src/runtime/stt.js');
    await stt.init();
    const result = await stt.transcribe(Buffer.from('audio'));
    expect(result).toBe('fallback-text');
  });

  // --- TTS tests ---

  it('tts.init() resolves with default adapter (openai-tts)', async () => {
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.from('mp3') }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({ tts: { provider: 'default' } }) }));
    const { init } = await import('../src/runtime/tts.js');
    await expect(init()).resolves.not.toThrow();
  });

  it('tts.synthesize(text) returns Buffer after init', async () => {
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.from('mp3data') }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const tts = await import('../src/runtime/tts.js');
    await tts.init();
    const result = await tts.synthesize('hello');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('tts.synthesize throws EMPTY_TEXT for empty/blank text', async () => {
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.alloc(0) }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const tts = await import('../src/runtime/tts.js');
    await tts.init();
    await expect(tts.synthesize('')).rejects.toMatchObject({ code: 'EMPTY_TEXT' });
    await expect(tts.synthesize('   ')).rejects.toMatchObject({ code: 'EMPTY_TEXT' });
  });

  it('tts.synthesize throws "not initialized" before init()', async () => {
    const tts = await import('../src/runtime/tts.js');
    await expect(tts.synthesize('hello')).rejects.toThrow('not initialized');
  });

  it('tts uses adapter.synthesize directly when module exports it', async () => {
    // The adapter module exports { synthesize } directly — tts.js uses mod as-is
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.from('direct-export') }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({}) }));
    const tts = await import('../src/runtime/tts.js');
    await tts.init();
    const result = await tts.synthesize('hello');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe('direct-export');
  });

  it('tts falls back to default adapter if configured provider import fails', async () => {
    vi.doMock('agentic-voice/kokoro', () => { throw new Error('MODULE_NOT_FOUND'); });
    vi.doMock('agentic-voice/openai-tts', () => ({ synthesize: async () => Buffer.from('fallback-audio') }));
    vi.doMock('../src/detector/hardware.js', () => ({ detect: async () => ({}) }));
    vi.doMock('../src/detector/profiles.js', () => ({ getProfile: async () => ({ tts: { provider: 'kokoro' } }) }));
    const tts = await import('../src/runtime/tts.js');
    await tts.init();
    const result = await tts.synthesize('hello');
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe('fallback-audio');
  });

  // --- Adapter subpath mock shape tests ---

  it('openai-whisper adapter exports transcribe function', async () => {
    const mod = await import('../src/runtime/adapters/voice/openai-whisper.js');
    expect(typeof mod.transcribe).toBe('function');
  });

  it('openai-tts adapter exports synthesize function', async () => {
    const mod = await import('../src/runtime/adapters/voice/openai-tts.js');
    expect(typeof mod.synthesize).toBe('function');
  });
});
