import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8'));

describe('M86: agentic-sense external package wiring', () => {
  it('agentic-sense dep uses file: reference', () => {
    expect(pkg.dependencies?.['agentic-sense']).toMatch(/^file:/);
  });

  it('imports map has no #agentic-sense alias (removed)', () => {
    expect(pkg.imports?.['#agentic-sense']).toBeUndefined();
  });

  it('adapters/sense.js imports from agentic-sense directly', () => {
    const src = readFileSync(resolve(ROOT, 'src/runtime/adapters/sense.js'), 'utf8');
    expect(src).toMatch(/from\s+['"]agentic-sense['"]/);
  });
});
