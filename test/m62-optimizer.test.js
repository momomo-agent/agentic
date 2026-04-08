import { describe, it, expect } from 'vitest';
import { optimize } from '../src/detector/optimizer.js';

describe('DBB-003: optimizer.js hardware-adaptive config', () => {
  it('apple-silicon 16GB → threads=8, memoryLimit=12, model=gemma4:26b', () => {
    expect(optimize({ gpu: { type: 'apple-silicon' }, memory: 16, cpu: { cores: 8 } }))
      .toEqual({ threads: 8, memoryLimit: 12, model: 'gemma4:26b' });
  });

  it('nvidia vram=8 → threads=4, memoryLimit=6, model=gemma4:13b', () => {
    expect(optimize({ gpu: { type: 'nvidia', vram: 8 }, memory: 16, cpu: { cores: 4 } }))
      .toEqual({ threads: 4, memoryLimit: 6, model: 'gemma4:13b' });
  });

  it('nvidia no vram → falls back to memory*0.5', () => {
    const result = optimize({ gpu: { type: 'nvidia' }, memory: 16, cpu: { cores: 4 } });
    expect(result.memoryLimit).toBe(Math.floor(16 * 0.5 * 0.8));
    expect(result.model).toBe('gemma4:13b');
  });

  it('cpu-only 8GB 4 cores → threads=4, memoryLimit=4, model=gemma2:2b', () => {
    expect(optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } }))
      .toEqual({ threads: 4, memoryLimit: 4, model: 'gemma2:2b' });
  });

  it('cpu-only no cores → defaults to 2', () => {
    const result = optimize({ gpu: { type: 'none' }, memory: 8, cpu: {} });
    expect(result.threads).toBe(2);
  });
});
