import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('M74: Test coverage >=98% threshold enforcement', () => {
  it('vitest.config.js exists', () => {
    const content = readFileSync(resolve(process.cwd(), 'vitest.config.js'), 'utf8');
    expect(content).toBeTruthy();
  });

  it('coverage thresholds are set to >=98% in vitest.config.js', () => {
    const content = readFileSync(resolve(process.cwd(), 'vitest.config.js'), 'utf8');
    // Check all four threshold types are present and set to 98
    expect(content).toMatch(/lines\s*:\s*98/);
    expect(content).toMatch(/functions\s*:\s*98/);
    expect(content).toMatch(/branches\s*:\s*98/);
    expect(content).toMatch(/statements\s*:\s*98/);
  });

  it('thresholds block is nested under coverage in vitest.config.js', () => {
    const content = readFileSync(resolve(process.cwd(), 'vitest.config.js'), 'utf8');
    expect(content).toMatch(/coverage\s*:\s*\{/);
    expect(content).toMatch(/thresholds\s*:\s*\{/);
  });
});
