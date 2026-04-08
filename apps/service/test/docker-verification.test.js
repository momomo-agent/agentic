import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { describe, it, expect } from 'vitest';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const INSTALL = resolve(ROOT, 'install');

describe('Docker build and docker-compose verification', () => {
  it('Dockerfile exists in install/', () => {
    expect(existsSync(`${INSTALL}/Dockerfile`)).toBe(true);
  });

  it('docker-compose.yml exists in install/', () => {
    expect(existsSync(`${INSTALL}/docker-compose.yml`)).toBe(true);
  });

  it('all package.json dependencies exist in npm registry', () => {
    const pkg = JSON.parse(execSync('cat package.json', { cwd: ROOT }).toString());
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const missing = [];
    for (const dep of deps) {
      try {
        execSync(`npm show ${dep} version`, { stdio: 'pipe' });
      } catch {
        missing.push(dep);
      }
    }
    expect(missing, `Missing from npm registry: ${missing.join(', ')}`).toEqual([]);
  });

  it('docker build exits 0', () => {
    const result = execSync(
      'docker build -t agentic-service-test -f install/Dockerfile .',
      { cwd: ROOT, stdio: 'pipe', timeout: 120000 }
    );
    expect(result).toBeTruthy();
  });
});
