import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '../..');

describe('agentic-sense package wiring', () => {
  it('adapters/sense.js imports from agentic-sense directly', () => {
    const src = readFileSync(resolve(ROOT, 'src/runtime/adapters/sense.js'), 'utf8');
    expect(src).toMatch(/from\s+['"]agentic-sense['"]/);
    expect(src).not.toMatch(/from\s+['"]#agentic-sense['"]/);
  });

  it('package.json has no #agentic-sense import map entry', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.imports?.['#agentic-sense']).toBeUndefined();
  });

  it('package.json has agentic-sense in dependencies', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies?.['agentic-sense']).toBeDefined();
  });
});
