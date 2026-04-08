import { describe, it, expect } from 'vitest';

describe('optimizer.js M21 DBB', () => {
  it('DBB-003: exports setupOllama function accepting profile', async () => {
    const mod = await import('../src/detector/optimizer.js');
    expect(typeof mod.setupOllama).toBe('function');
  });
});
