import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('M84 DBB: agentic-sense wired as external package', () => {
  it('package.json has agentic-sense in dependencies', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
    expect(pkg.dependencies).toHaveProperty('agentic-sense');
  });

  it('src/runtime/adapters/sense.js imports from agentic-sense (not import map)', () => {
    const source = readFileSync(resolve('src/runtime/adapters/sense.js'), 'utf8');
    expect(source).toMatch(/from\s+['"]agentic-sense['"]/);
    expect(source).not.toMatch(/from\s+['"]#agentic-sense['"]/);
  });

  it('package.json does not have #agentic-sense in imports map', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
    const imports = pkg.imports || {};
    expect(imports).not.toHaveProperty('#agentic-sense');
  });

  it('src/runtime/sense.js exports expected API', async () => {
    const sense = await import('../src/runtime/sense.js');
    expect(sense).toHaveProperty('init');
    expect(sense).toHaveProperty('detect');
    expect(sense).toHaveProperty('start');
    expect(sense).toHaveProperty('stop');
    expect(sense).toHaveProperty('on');
  });

  it('detect() returns valid structure', async () => {
    const { detect, initHeadless } = await import('../src/runtime/sense.js');
    await initHeadless();
    const result = detect({ data: 'mock-frame' });
    expect(result).toHaveProperty('faces');
    expect(result).toHaveProperty('gestures');
    expect(result).toHaveProperty('objects');
    expect(Array.isArray(result.faces)).toBe(true);
    expect(Array.isArray(result.gestures)).toBe(true);
    expect(Array.isArray(result.objects)).toBe(true);
  });
});
