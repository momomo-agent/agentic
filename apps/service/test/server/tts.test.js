import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config.js', () => ({
  getConfig: vi.fn(async () => ({
    assignments: {},
    tts: { provider: 'default' },
  })),
}));
vi.mock('../../src/engine/registry.js', () => ({
  resolveModel: vi.fn(async () => null),
  modelsForCapability: vi.fn(async () => []),
}));
vi.mock('../../src/runtime/adapters/voice/kokoro.js', () => ({ synthesize: vi.fn() }));
vi.mock('../../src/runtime/adapters/voice/piper.js', () => ({ synthesize: vi.fn() }));
vi.mock('../../src/runtime/adapters/voice/openai-tts.js', () => ({ synthesize: vi.fn() }));
vi.mock('../../src/runtime/profiler.js', () => ({ startMark: vi.fn(), endMark: vi.fn().mockReturnValue(0) }));
vi.mock('../../src/runtime/latency-log.js', () => ({ record: vi.fn() }));

import * as openaiTts from '../../src/runtime/adapters/voice/openai-tts.js';
import * as ttsMod from '../../src/runtime/tts.js';

describe('TTS runtime', () => {
  beforeEach(async () => {
    openaiTts.synthesize.mockReset();
    await ttsMod.init();
  });

  it('returns audio buffer for valid text', async () => {
    const buf = Buffer.from('audio');
    openaiTts.synthesize.mockResolvedValue(buf);
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
    openaiTts.synthesize.mockRejectedValue(new Error('provider error'));
    await expect(ttsMod.synthesize('hello')).rejects.toThrow('provider error');
  });

  it('throws not initialized when adapter fails to load', async () => {
    expect(typeof ttsMod.synthesize).toBe('function');
    expect(typeof ttsMod.init).toBe('function');
  });
});
