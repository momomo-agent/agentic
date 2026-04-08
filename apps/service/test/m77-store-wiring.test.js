import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const src = readFileSync('src/store/index.js', 'utf8');

describe('agentic-store wiring (m77)', () => {
  it('imports from agentic-store package', () => {
    expect(src).toMatch(/from ['"]agentic-store['"]/);
  });

  it('exports get, set, del/delete', () => {
    expect(src).toContain('export async function get');
    expect(src).toContain('export async function set');
    expect(src).toMatch(/export.*del/);
  });
});
