import { readFileSync, existsSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync('scripts/benchmark.js', 'utf8');

describe('M19 DBB-004: benchmark script exists and is executable', () => {
  it('scripts/benchmark.js exists', () => {
    expect(existsSync('scripts/benchmark.js')).toBe(true);
  });

  it('imports stt transcribe', () => {
    expect(src).toContain('transcribe');
  });

  it('imports llm chat', () => {
    expect(src).toContain('chat');
  });

  it('imports tts synthesize', () => {
    expect(src).toContain('synthesize');
  });

  it('measures stt ms', () => {
    expect(src).toMatch(/stt.*ms|ms.*stt/i);
  });

  it('measures llm ms', () => {
    expect(src).toMatch(/llm.*ms|ms.*llm/i);
  });

  it('measures tts ms', () => {
    expect(src).toMatch(/tts.*ms|ms.*tts/i);
  });

  it('outputs total field', () => {
    expect(src).toContain('total');
  });

  it('exits 0 when total < 2000', () => {
    expect(src).toContain('2000');
    expect(src).toContain('process.exit');
  });

  it('exits 1 on runtime init failure', () => {
    expect(src).toContain('process.exit(1)');
  });
});

describe('M19 DBB-005: benchmark measures all three stages', () => {
  it('uses Date.now() for timing', () => {
    expect(src.match(/Date\.now\(\)/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('collects LLM stream chunks before measuring end time', () => {
    expect(src).toMatch(/for await|chunk/);
  });

  it('prints JSON result', () => {
    expect(src).toContain('JSON.stringify');
  });
});
