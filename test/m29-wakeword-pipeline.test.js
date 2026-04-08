import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('agentic-sense', () => ({
  AgenticSense: class { detect = vi.fn() },
  createPipeline: vi.fn(async () => ({ detect: vi.fn(), _video: null }))
}));

describe('startWakeWordPipeline', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns a stop function', async () => {
    const { startWakeWordPipeline } = await import('../src/runtime/sense.js');
    const stop = await startWakeWordPipeline(() => {});
    expect(typeof stop).toBe('function');
    stop();
  });

  it('stop function halts pipeline (second call returns no-op)', async () => {
    const { startWakeWordPipeline } = await import('../src/runtime/sense.js');
    const stop = await startWakeWordPipeline(() => {});
    stop();
    const stop2 = await startWakeWordPipeline(() => {});
    expect(typeof stop2).toBe('function');
    stop2();
  });

  it('multiple calls while active return no-op stop', async () => {
    const { startWakeWordPipeline } = await import('../src/runtime/sense.js');
    const cb = vi.fn();
    const stop1 = await startWakeWordPipeline(cb);
    const stop2 = await startWakeWordPipeline(cb);
    expect(typeof stop2).toBe('function');
    stop1();
    stop2();
  });
});
