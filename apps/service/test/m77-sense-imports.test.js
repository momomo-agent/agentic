import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('m77-sense-imports', () => {
  const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
  const adapterPath = resolve('src/runtime/adapters/sense.js');

  it('agentic-sense in dependencies', () => {
    expect(pkg.dependencies).toHaveProperty('agentic-sense');
  });

  it('src/runtime/adapters/sense.js exists', () => {
    expect(existsSync(adapterPath)).toBe(true);
  });

  it('sense.js imports from agentic-sense', () => {
    const src = readFileSync(adapterPath, 'utf8');
    expect(src).toContain('agentic-sense');
  });

  it('sense.js exports createPipeline', () => {
    const src = readFileSync(adapterPath, 'utf8');
    expect(src).toContain('createPipeline');
  });

  it('runtime sense.js is importable', async () => {
    await expect(import('../src/runtime/sense.js')).resolves.toBeDefined();
  });
});
