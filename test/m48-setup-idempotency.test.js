import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';

const setup = readFileSync('install/setup.sh', 'utf8');

describe('setup.sh Node.js detection and idempotency (DBB-005)', () => {
  it('checks for node command', () => {
    expect(setup).toContain('command -v node');
  });

  it('checks Node.js version >= 18', () => {
    expect(setup).toMatch(/NODE_MAJOR.*18|18.*NODE_MAJOR/);
  });

  it('has install_node function', () => {
    expect(setup).toContain('install_node()');
  });

  it('handles macOS via brew or nvm', () => {
    expect(setup).toContain('Darwin');
    expect(setup).toMatch(/brew install node|nvm install/);
  });

  it('handles Linux via nvm or apt', () => {
    expect(setup).toContain('Linux');
    expect(setup).toMatch(/apt-get|nvm install/);
  });

  it('is idempotent — checks if already installed before npm install', () => {
    expect(setup).toContain('npm list -g agentic-service');
    expect(setup).toContain('already installed');
  });

  it('exits with error on Windows', () => {
    expect(setup).toContain('Windows not supported');
    expect(setup).toContain('exit 1');
  });
});
