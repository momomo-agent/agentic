import { describe, it, expect, vi } from 'vitest';

vi.mock('node:child_process', () => ({ exec: vi.fn(), spawn: vi.fn() }));
vi.mock('ora', () => ({ default: () => ({ start: vi.fn().mockReturnThis(), succeed: vi.fn().mockReturnThis(), fail: vi.fn().mockReturnThis(), info: vi.fn().mockReturnThis(), text: '' }) }));
vi.mock('chalk', () => ({ default: { red: s => s, yellow: s => s, cyan: s => s, white: s => s, gray: s => s } }));

const { optimize } = await import('../../src/detector/optimizer.js');

describe('optimize() hardware-adaptive config', () => {
  it('apple-silicon → quantization q8, model gemma4:26b', () => {
    const r = optimize({ gpu: { type: 'apple-silicon' }, memory: 16, cpu: { cores: 8 } });
    expect(r.quantization).toBe('q8');
    expect(r.model).toBe('gemma4:26b');
    expect(r.threads).toBe(8);
    expect(r.memoryLimit).toBe(Math.floor(16 * 0.75));
  });

  it('nvidia → quantization q4, model gemma4:13b', () => {
    const r = optimize({ gpu: { type: 'nvidia', vram: 8 }, memory: 16, cpu: { cores: 4 } });
    expect(r.quantization).toBe('q4');
    expect(r.model).toBe('gemma4:13b');
    expect(r.threads).toBe(4);
    expect(r.memoryLimit).toBe(Math.floor(8 * 0.8));
  });

  it('nvidia without vram → falls back to memory * 0.5', () => {
    const r = optimize({ gpu: { type: 'nvidia' }, memory: 16, cpu: { cores: 4 } });
    expect(r.memoryLimit).toBe(Math.floor(8 * 0.8));
  });

  it('cpu-only → quantization q4, model gemma2:2b', () => {
    const r = optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } });
    expect(r.quantization).toBe('q4');
    expect(r.model).toBe('gemma2:2b');
    expect(r.threads).toBe(4);
  });

  it('cpu-only without cores → threads defaults to 2', () => {
    const r = optimize({ gpu: { type: 'none' }, memory: 8, cpu: {} });
    expect(r.threads).toBe(2);
  });
});
