import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('agentic-sense', () => ({
  AgenticSense: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(undefined),
    detect: vi.fn().mockReturnValue({
      faces: [{ boundingBox: { x: 0, y: 0, w: 10, h: 10 } }],
      gestures: [{ gesture: 'wave' }],
      objects: [
        { label: 'cat', confidence: 0.9 },
        { label: 'noise', confidence: 0.3 },
      ],
    }),
  })),
}));

describe('M87: createPipeline export from adapters/sense.js', () => {
  it('createPipeline is exported from adapters/sense.js', async () => {
    const mod = await import('../src/runtime/adapters/sense.js');
    expect(typeof mod.createPipeline).toBe('function');
  });

  it('createPipeline returns object with detect()', async () => {
    const { createPipeline } = await import('../src/runtime/adapters/sense.js');
    const pipeline = createPipeline();
    expect(typeof pipeline.detect).toBe('function');
  });

  it('detect() returns faces/gestures/objects', async () => {
    const { createPipeline } = await import('../src/runtime/adapters/sense.js');
    const pipeline = createPipeline();
    const result = pipeline.detect({});
    expect(result.faces).toHaveLength(1);
    expect(result.gestures).toHaveLength(1);
    expect(result.objects).toHaveLength(2);
  });
});

describe('M87: sense.js imports createPipeline from adapter', () => {
  it('sense.js source imports from ./adapters/sense.js not agentic-sense', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const src = readFileSync(resolve(import.meta.dirname, '../src/runtime/sense.js'), 'utf8');
    expect(src).toMatch(/from\s+['"]\.\/adapters\/sense\.js['"]/);
    expect(src).not.toMatch(/from\s+['"]agentic-sense['"]/);
  });
});
