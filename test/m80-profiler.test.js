import { describe, it, expect } from 'vitest';
import { startMark, endMark, measurePipeline } from '../src/runtime/profiler.js';

describe('profiler', () => {
  it('endMark returns elapsed >= 0', async () => {
    startMark('x');
    await new Promise(r => setTimeout(r, 10));
    const ms = endMark('x');
    expect(ms).toBeGreaterThanOrEqual(0);
  });

  it('endMark returns null for unknown label', () => {
    expect(endMark('nonexistent')).toBeNull();
  });

  it('measurePipeline totals stages and passes when < 2000ms', () => {
    const result = measurePipeline([
      { name: 'stt', durationMs: 300 },
      { name: 'llm', durationMs: 1000 },
      { name: 'tts', durationMs: 500 },
    ]);
    expect(result.total).toBe(1800);
    expect(result.pass).toBe(true);
  });

  it('measurePipeline fails when >= 2000ms', () => {
    const result = measurePipeline([
      { name: 'stt', durationMs: 1000 },
      { name: 'llm', durationMs: 1000 },
      { name: 'tts', durationMs: 1 },
    ]);
    expect(result.pass).toBe(false);
  });
});
