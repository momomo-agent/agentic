import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(import.meta.dirname, '..');
const INSTALL = resolve(ROOT, 'install');

describe('M86: Docker fix — agentic-* local package resolution', () => {
  it('package.json uses workspace: references for all agentic-* deps', () => {
    const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, 'utf8'));
    const deps = pkg.dependencies || {};
    for (const name of ['agentic-embed', 'agentic-sense', 'agentic-store', 'agentic-voice']) {
      expect(deps[name], `${name} missing from dependencies`).toBeDefined();
      expect(deps[name], `${name} should use workspace: reference`).toMatch(/^workspace:/);
    }
  });

  it('Dockerfile copies vendor/ before npm ci', () => {
    const dockerfile = readFileSync(`${INSTALL}/Dockerfile`, 'utf8');
    const lines = dockerfile.split('\n');
    const vendorIdx = lines.findIndex(l => l.includes('COPY vendor/'));
    const npmCiIdx = lines.findIndex(l => l.includes('npm ci'));
    expect(vendorIdx, 'Dockerfile must COPY vendor/').toBeGreaterThan(-1);
    expect(npmCiIdx, 'Dockerfile must run npm ci').toBeGreaterThan(-1);
    expect(vendorIdx, 'vendor/ must be copied before npm ci').toBeLessThan(npmCiIdx);
  });

  it('docker-build.sh exists and packs all agentic-* packages', () => {
    const script = readFileSync(`${INSTALL}/docker-build.sh`, 'utf8');
    for (const pkg of ['agentic-embed', 'agentic-sense', 'agentic-store', 'agentic-voice']) {
      expect(script).toContain(pkg);
    }
    expect(script).toContain('npm pack');
    expect(script).toContain('docker build');
  });

  it('.dockerignore does not exclude vendor/', () => {
    const ignorePath = `${ROOT}/.dockerignore`;
    if (!existsSync(ignorePath)) return; // no .dockerignore is fine
    const content = readFileSync(ignorePath, 'utf8');
    const lines = content.split('\n').map(l => l.trim());
    // vendor/ must not be excluded (unless re-included with !)
    const excluded = lines.filter(l => l === 'vendor' || l === 'vendor/');
    const reincluded = lines.some(l => l === '!vendor' || l === '!vendor/');
    expect(excluded.length === 0 || reincluded, 'vendor/ must not be excluded from Docker context').toBe(true);
  });

  it('docker-compose.yml build context points to project root', () => {
    const compose = readFileSync(`${INSTALL}/docker-compose.yml`, 'utf8');
    // build: .. means root, or build: context: ..
    expect(compose).toMatch(/build:\s*\.\./);
  });

  it('docker-build.sh uses set -e for fail-fast behavior', () => {
    const script = readFileSync(`${INSTALL}/docker-build.sh`, 'utf8');
    expect(script).toContain('set -e');
  });

  it('docker-build.sh checks for missing sibling packages before building', () => {
    const script = readFileSync(`${INSTALL}/docker-build.sh`, 'utf8');
    expect(script).toMatch(/exit 1/);
  });
});
