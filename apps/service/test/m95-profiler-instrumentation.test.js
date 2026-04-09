import { describe, it, expect, beforeEach } from 'vitest';
import { startMark, endMark, getMetrics, measurePipeline } from '../src/runtime/profiler.js';

describe('m95 CPU profiling instrumentation verification', () => {

  describe('profiler edge cases', () => {
    it('endMark returns null when no matching startMark exists', () => {
      expect(endMark('never-started')).toBeNull();
    });

    it('endMark cleans up mark after completion', async () => {
      startMark('cleanup-test');
      await new Promise(r => setTimeout(r, 2));
      expect(endMark('cleanup-test')).toBeGreaterThanOrEqual(0);
      // Second call should return null (mark was consumed)
      expect(endMark('cleanup-test')).toBeNull();
    });

    it('concurrent marks with different labels track independently', async () => {
      startMark('concurrent-a');
      startMark('concurrent-b');
      await new Promise(r => setTimeout(r, 5));
      const a = endMark('concurrent-a');
      await new Promise(r => setTimeout(r, 5));
      const b = endMark('concurrent-b');
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeGreaterThanOrEqual(a);
    });

    it('overwriting a startMark restarts timing', async () => {
      startMark('overwrite');
      await new Promise(r => setTimeout(r, 10));
      startMark('overwrite'); // restart
      await new Promise(r => setTimeout(r, 2));
      const elapsed = endMark('overwrite');
      // Should be ~2ms, not ~12ms
      expect(elapsed).toBeLessThan(8);
    });

    it('metrics accumulate across multiple calls', async () => {
      startMark('accum');
      await new Promise(r => setTimeout(r, 2));
      endMark('accum');

      startMark('accum');
      await new Promise(r => setTimeout(r, 2));
      endMark('accum');

      startMark('accum');
      await new Promise(r => setTimeout(r, 2));
      endMark('accum');

      const m = getMetrics();
      expect(m['accum'].count).toBe(3);
    });
  });

  describe('getMetrics output format', () => {
    it('returns { last, avg, count } for each label', async () => {
      startMark('fmt-test');
      await new Promise(r => setTimeout(r, 2));
      endMark('fmt-test');

      const m = getMetrics();
      expect(m['fmt-test']).toBeDefined();
      expect(typeof m['fmt-test'].last).toBe('number');
      expect(typeof m['fmt-test'].avg).toBe('number');
      expect(typeof m['fmt-test'].count).toBe('number');
    });

    it('avg rounds to integer', async () => {
      startMark('round-test');
      await new Promise(r => setTimeout(r, 1));
      endMark('round-test');
      startMark('round-test');
      await new Promise(r => setTimeout(r, 3));
      endMark('round-test');

      const m = getMetrics();
      expect(Number.isInteger(m['round-test'].avg)).toBe(true);
    });
  });

  describe('measurePipeline edge cases', () => {
    it('returns pass=true when total < 2000ms', () => {
      const result = measurePipeline([
        { name: 'stt', durationMs: 500 },
        { name: 'llm', durationMs: 800 },
        { name: 'tts', durationMs: 400 },
      ]);
      expect(result.total).toBe(1700);
      expect(result.pass).toBe(true);
    });

    it('returns pass=false when total >= 2000ms', () => {
      const result = measurePipeline([
        { durationMs: 1000 },
        { durationMs: 1000 },
      ]);
      expect(result.total).toBe(2000);
      expect(result.pass).toBe(false);
    });

    it('handles empty stages array', () => {
      const result = measurePipeline([]);
      expect(result.total).toBe(0);
      expect(result.pass).toBe(true);
    });

    it('handles single stage', () => {
      const result = measurePipeline([{ durationMs: 1999 }]);
      expect(result.total).toBe(1999);
      expect(result.pass).toBe(true);
    });

    it('preserves stages array in output', () => {
      const stages = [
        { name: 'stt', durationMs: 100 },
        { name: 'llm', durationMs: 200 },
      ];
      const result = measurePipeline(stages);
      expect(result.stages).toEqual(stages);
    });
  });

  describe('profiler integration with runtime modules', () => {
    const srcDir = new URL('../src', import.meta.url).pathname;

    it('source: stt.js imports startMark/endMark from profiler.js', async () => {
      const sttSource = await import('fs/promises').then(fs =>
        fs.readFile(`${srcDir}/runtime/stt.js`, 'utf8')
      );
      expect(sttSource).toContain("from './profiler.js'");
      expect(sttSource).toContain("startMark('stt')");
      expect(sttSource).toContain("endMark('stt')");
    });

    it('source: llm.js imports startMark/endMark from profiler.js', async () => {
      const llmSource = await import('fs/promises').then(fs =>
        fs.readFile(`${srcDir}/runtime/llm.js`, 'utf8')
      );
      expect(llmSource).toContain("from './profiler.js'");
      expect(llmSource).toContain("startMark('llm')");
      expect(llmSource).toContain("endMark('llm')");
    });

    it('source: tts.js imports startMark/endMark from profiler.js', async () => {
      const ttsSource = await import('fs/promises').then(fs =>
        fs.readFile(`${srcDir}/runtime/tts.js`, 'utf8')
      );
      expect(ttsSource).toContain("from './profiler.js'");
      expect(ttsSource).toContain("startMark('tts')");
      expect(ttsSource).toContain("endMark('tts')");
    });

    it('source: memory.js uses profiler for memory-add and memory-search', async () => {
      const memSource = await import('fs/promises').then(fs =>
        fs.readFile(`${srcDir}/runtime/memory.js`, 'utf8')
      );
      expect(memSource).toContain("from './profiler.js'");
      expect(memSource).toContain("startMark('memory-add')");
      expect(memSource).toContain("endMark('memory-add')");
      expect(memSource).toContain("startMark('memory-search')");
      expect(memSource).toContain("endMark('memory-search')");
    });

    it('source: api.js imports getMetrics and exposes /api/perf endpoint', async () => {
      const apiSource = await import('fs/promises').then(fs =>
        fs.readFile(`${srcDir}/server/api.js`, 'utf8')
      );
      expect(apiSource).toContain('getMetrics');
      expect(apiSource).toContain('/api/perf');
      expect(apiSource).toContain("startMark('voice-pipeline')");
      expect(apiSource).toContain("endMark('voice-pipeline')");
    });
  });

  describe('profiler labels coverage', () => {
    it('all expected pipeline stages are profiled in source code', async () => {
      const fs = await import('fs/promises');
      const srcDir = new URL('../src', import.meta.url).pathname;

      const stt = await fs.readFile(`${srcDir}/runtime/stt.js`, 'utf8');
      const llm = await fs.readFile(`${srcDir}/runtime/llm.js`, 'utf8');
      const tts = await fs.readFile(`${srcDir}/runtime/tts.js`, 'utf8');
      const memory = await fs.readFile(`${srcDir}/runtime/memory.js`, 'utf8');
      const api = await fs.readFile(`${srcDir}/server/api.js`, 'utf8');

      // Each core pipeline stage has profiling
      expect(stt).toMatch(/startMark\('stt'\)/);
      expect(llm).toMatch(/startMark\('llm'\)/);
      expect(tts).toMatch(/startMark\('tts'\)/);

      // Memory operations are profiled
      expect(memory).toMatch(/startMark\('memory-add'\)/);
      expect(memory).toMatch(/startMark\('memory-search'\)/);

      // Voice pipeline endpoint has profiling
      expect(api).toMatch(/startMark\('voice-pipeline'\)/);
      expect(api).toMatch(/endMark\('voice-pipeline'\)/);

      // /api/perf returns metrics
      expect(api).toMatch(/getMetrics\(\)/);
    });
  });
});
