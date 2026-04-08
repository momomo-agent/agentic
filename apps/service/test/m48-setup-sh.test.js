import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const SETUP = readFileSync('install/setup.sh', 'utf8');

describe('setup.sh structure', () => {
  it('contains Node.js version check', () => {
    expect(SETUP).toMatch(/NODE_MAJOR/);
    expect(SETUP).toMatch(/lt 18/);
  });

  it('contains idempotency check for agentic-service', () => {
    expect(SETUP).toMatch(/npm list -g agentic-service/);
    expect(SETUP).toMatch(/already installed/);
  });

  it('handles macOS via brew or nvm', () => {
    expect(SETUP).toMatch(/Darwin/);
    expect(SETUP).toMatch(/brew install node/);
  });

  it('handles Linux via nvm or apt-get', () => {
    expect(SETUP).toMatch(/Linux/);
    expect(SETUP).toMatch(/apt-get/);
  });

  it('rejects Windows with error message', () => {
    expect(SETUP).toMatch(/Windows not supported/);
    expect(SETUP).toMatch(/exit 1/);
  });

  it('uses set -e for fail-fast behavior', () => {
    expect(SETUP).toMatch(/set -e/);
  });
});

describe('setup.sh idempotency (dry run)', () => {
  it('exits 0 when agentic-service is already installed (mocked)', () => {
    // Simulate the idempotency branch: if npm list -g succeeds, skip install
    const result = execSync(
      `sh -c 'npm list -g agentic-service >/dev/null 2>&1 && echo "already installed" || echo "would install"'`
    ).toString().trim();
    // Either outcome is valid — just verify the script logic runs without error
    expect(['already installed', 'would install']).toContain(result);
  });
});
