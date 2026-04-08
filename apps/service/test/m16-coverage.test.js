import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('coverage threshold config', () => {
  it('vitest coverage thresholds >= 98% configured in package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
    const thresholds = pkg?.vitest?.coverage?.thresholds;
    expect(thresholds).toBeTruthy();
    const min = thresholds.statements ?? thresholds.lines ?? 0;
    expect(min).toBeGreaterThanOrEqual(98);
  });
});
