// M28 DBB-007: Docker构建 / DBB-009: setup.sh幂等性
import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const dockerfile = readFileSync('install/Dockerfile', 'utf8');
const setupSh = readFileSync('install/setup.sh', 'utf8');

describe('DBB-007: Dockerfile is valid', () => {
  it('uses node base image', () => {
    expect(dockerfile).toMatch(/FROM node:/);
  });
  it('sets WORKDIR', () => {
    expect(dockerfile).toContain('WORKDIR');
  });
  it('copies package.json and runs npm ci', () => {
    expect(dockerfile).toContain('package*.json');
    expect(dockerfile).toContain('npm ci');
  });
  it('exposes port 3000', () => {
    expect(dockerfile).toContain('EXPOSE 3000');
  });
  it('starts with node bin/agentic-service.js', () => {
    expect(dockerfile).toContain('bin/agentic-service.js');
  });
});

describe('DBB-009: setup.sh idempotency', () => {
  it('checks if node is installed', () => {
    expect(setupSh).toMatch(/command -v node|which node/);
  });
  it('prints already installed message', () => {
    expect(setupSh).toContain('already installed');
  });
  it('skips npm install if already present', () => {
    expect(setupSh).toContain('npm list');
  });
  it('exits with error if Node.js not found', () => {
    expect(setupSh).toContain('exit 1');
  });
  it('requires Node.js >= 18', () => {
    expect(setupSh).toMatch(/18|NODE_MAJOR/);
  });
});
