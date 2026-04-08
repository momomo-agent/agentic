import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const setup = readFileSync('install/setup.sh', 'utf8');

describe('setup.sh idempotency (m74 DBB)', () => {
  it('skips node install when already present', () => {
    expect(setup).toContain('if ! command -v node');
  });

  it('skips node install when version >= 18', () => {
    expect(setup).toMatch(/\[ "\$NODE_MAJOR" -lt 18 \]/);
  });

  it('skips npm install when node_modules exists', () => {
    expect(setup).toContain('if [ ! -d node_modules ]');
  });

  it('skips global install when already installed', () => {
    expect(setup).toContain('npm list -g agentic-service');
    expect(setup).toContain('already installed');
  });

  it('does not append to PATH unconditionally', () => {
    const lines = setup.split('\n').filter(l => l.includes('PATH=') && !l.trim().startsWith('#'));
    for (const line of lines) {
      expect(line).toMatch(/^\s+/);
    }
  });

  it('exits 0 on re-run — install steps are inside guarded function', () => {
    expect(setup).toContain('set -e');
    // install_node() must be defined as a function (called conditionally, not inline)
    expect(setup).toMatch(/install_node\(\)\s*\{/);
    // The function must be called only inside conditional blocks
    const callSites = setup.split('\n').filter(l => /^\s*install_node\b/.test(l) && !l.includes('()'));
    for (const line of callSites) {
      // Each call site must be indented (inside an if block)
      expect(line).toMatch(/^\s+/);
    }
  });
});
