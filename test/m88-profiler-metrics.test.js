import { describe, it, expect, beforeEach } from 'vitest';
import { startMark, endMark, getMetrics } from '../src/runtime/profiler.js';

describe('m88 profiler getMetrics', () => {
  beforeEach(() => {
    // drain any leftover marks by calling endMark on known labels
    endMark('__reset_stt__');
    endMark('__reset_llm__');
    endMark('__reset_tts__');
  });

  it('getMetrics returns empty object before any marks', () => {
    const m = getMetrics();
    expect(typeof m).toBe('object');
  });

  it('getMetrics accumulates last/avg/count after endMark', async () => {
    startMark('test-stage');
    await new Promise(r => setTimeout(r, 5));
    endMark('test-stage');

    const m = getMetrics();
    expect(m['test-stage']).toBeDefined();
    expect(m['test-stage'].count).toBeGreaterThanOrEqual(1);
    expect(m['test-stage'].last).toBeGreaterThanOrEqual(0);
    expect(m['test-stage'].avg).toBeGreaterThanOrEqual(0);
  });

  it('avg increases count on repeated calls', async () => {
    startMark('repeat-stage');
    await new Promise(r => setTimeout(r, 2));
    endMark('repeat-stage');

    startMark('repeat-stage');
    await new Promise(r => setTimeout(r, 2));
    endMark('repeat-stage');

    const m = getMetrics();
    expect(m['repeat-stage'].count).toBeGreaterThanOrEqual(2);
  });

  it('endMark on unknown label does not throw and returns null', () => {
    expect(endMark('no-such-label')).toBeNull();
  });
});
