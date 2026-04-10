import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(process.cwd(), 'install');

describe('Docker deployment M13 DBB-006/007', () => {
  it('Dockerfile exists', () => {
    expect(existsSync(`${ROOT}/Dockerfile`)).toBe(true);
  });

  it('Dockerfile uses node:20-alpine base', () => {
    const content = readFileSync(`${ROOT}/Dockerfile`, 'utf8');
    expect(content).toMatch(/FROM node:20-alpine/);
  });

  it('Dockerfile exposes port 1234', () => {
    const content = readFileSync(`${ROOT}/Dockerfile`, 'utf8');
    expect(content).toMatch(/EXPOSE 1234/);
  });

  it('Dockerfile CMD starts agentic-service', () => {
    const content = readFileSync(`${ROOT}/Dockerfile`, 'utf8');
    expect(content).toMatch(/agentic-service/);
  });

  it('docker-compose.yml exists', () => {
    expect(existsSync(`${ROOT}/docker-compose.yml`)).toBe(true);
  });

  it('docker-compose.yml maps port 1234', () => {
    const content = readFileSync(`${ROOT}/docker-compose.yml`, 'utf8');
    expect(content).toMatch(/1234:1234/);
  });

  it('docker-compose.yml mounts config volume for persistence (DBB-007)', () => {
    const content = readFileSync(`${ROOT}/docker-compose.yml`, 'utf8');
    expect(content).toMatch(/\.agentic-service/);
  });

  it('docker-compose.yml has restart policy', () => {
    const content = readFileSync(`${ROOT}/docker-compose.yml`, 'utf8');
    expect(content).toMatch(/restart/);
  });
});
