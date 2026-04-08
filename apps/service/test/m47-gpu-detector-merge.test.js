import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { detect } from '../src/detector/hardware.js';

describe('gpu-detector.js merge into hardware.js', () => {
  it('gpu-detector.js does not exist (merged or never existed)', () => {
    expect(existsSync('src/detector/gpu-detector.js')).toBe(false);
  });

  it('hardware.js exports detect()', async () => {
    expect(typeof detect).toBe('function');
  });

  it('detect() returns gpu info', async () => {
    const result = await detect();
    expect(result).toHaveProperty('gpu');
    expect(result.gpu).toHaveProperty('type');
  });

  it('no imports of gpu-detector.js in codebase', async () => {
    const { execSync } = await import('child_process');
    const result = execSync('grep -r "gpu-detector" src/ --include="*.js" 2>/dev/null || true').toString();
    expect(result.trim()).toBe('');
  });
});
