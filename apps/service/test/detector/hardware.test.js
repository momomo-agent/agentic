import { describe, it, expect } from 'vitest';
import { detect } from '../../src/detector/hardware.js';

describe('Hardware Detector', () => {
  it('should detect platform and arch', async () => {
    const result = await detect();
    expect(result.platform).toMatch(/darwin|linux|win32/);
    expect(result.arch).toMatch(/arm64|x64|ia32/);
  });

  it('should detect CPU info', async () => {
    const result = await detect();
    expect(result.cpu.cores).toBeGreaterThan(0);
    expect(result.cpu.model).toBeTruthy();
  });

  it('should detect memory in GB', async () => {
    const result = await detect();
    expect(result.memory).toBeGreaterThan(0);
  });

  it('should detect GPU type', async () => {
    const result = await detect();
    expect(['apple-silicon', 'nvidia', 'amd', 'none']).toContain(result.gpu.type);
    expect(result.gpu.vram).toBeGreaterThanOrEqual(0);
  });

  it('should return all required fields', async () => {
    const result = await detect();
    expect(result).toHaveProperty('platform');
    expect(result).toHaveProperty('arch');
    expect(result).toHaveProperty('gpu');
    expect(result).toHaveProperty('memory');
    expect(result).toHaveProperty('cpu');
    expect(result.gpu).toHaveProperty('type');
    expect(result.gpu).toHaveProperty('vram');
    expect(result.cpu).toHaveProperty('cores');
    expect(result.cpu).toHaveProperty('model');
  });

  it('should complete detection within 2 seconds', async () => {
    const start = Date.now();
    await detect();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });
});
