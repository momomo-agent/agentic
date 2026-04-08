import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('agentic-voice/kokoro', () => ({ default: { synthesize: vi.fn() } }));
vi.mock('agentic-voice/piper', () => ({ default: { synthesize: vi.fn() } }));
vi.mock('agentic-voice/openai-tts', () => ({ default: { synthesize: vi.fn() } }));
vi.mock('../../src/detector/hardware.js', () => ({ detect: vi.fn().mockResolvedValue({}) }));
vi.mock('../../src/detector/profiles.js', () => ({ getProfile: vi.fn().mockResolvedValue({ tts: { provider: 'default' } }) }));
vi.mock('../../src/runtime/profiler.js', () => ({ startMark: vi.fn(), endMark: vi.fn().mockReturnValue(0) }));
vi.mock('../../src/runtime/latency-log.js', () => ({ record: vi.fn() }));

import * as openaiTts from 'agentic-voice/openai-tts';
import * as ttsMod from '../../src/runtime/tts.js';

describe('TTS runtime', () => {
  beforeEach(async () => {
    openaiTts.default.synthesize.mockReset();
    await ttsMod.init();
  });

  it('returns audio buffer for valid text', async () => {
    const buf = Buffer.from('audio');
    openaiTts.default.synthesize.mockResolvedValue(buf);
    expect(await ttsMod.synthesize('hello')).toBe(buf);
  });

  it('throws EMPTY_TEXT for empty string', async () => {
    const err = await ttsMod.synthesize('').catch(e => e);
    expect(err.code).toBe('EMPTY_TEXT');
  });

  it('throws EMPTY_TEXT for whitespace-only string', async () => {
    const err = await ttsMod.synthesize('   ').catch(e => e);
    expect(err.code).toBe('EMPTY_TEXT');
  });

  it('throws EMPTY_TEXT for null', async () => {
    const err = await ttsMod.synthesize(null).catch(e => e);
    expect(err.code).toBe('EMPTY_TEXT');
  });

  it('propagates provider errors', async () => {
    openaiTts.default.synthesize.mockRejectedValue(new Error('provider error'));
    await expect(ttsMod.synthesize('hello')).rejects.toThrow('provider error');
  });

  it('throws not initialized when adapter fails to load', async () => {
    expect(typeof ttsMod.synthesize).toBe('function');
    expect(typeof ttsMod.init).toBe('function');
  });
});
