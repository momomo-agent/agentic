import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function loadYamlSimple(relPath) {
  return readFileSync(resolve(ROOT, relPath), 'utf8');
}

describe('DBB-003/004/005: Docker port, OLLAMA_HOST, data volume', () => {
  describe('root docker-compose.yml', () => {
    const raw = loadYamlSimple('docker-compose.yml');

    it('DBB-003: port mapping is 1234 (not 3000)', () => {
      expect(raw.includes('1234')).toBeTruthy();
      expect(!raw.includes('3000')).toBeTruthy();
    });

    it('DBB-004: OLLAMA_HOST env var is present', () => {
      expect(raw.includes('OLLAMA_HOST')).toBeTruthy();
    });

    it('DBB-005: ./data volume mount is present', () => {
      expect(raw.includes('./data')).toBeTruthy();
    });

    it('port mapping format is 1234:1234', () => {
      expect(/1234:1234/.test(raw)).toBeTruthy();
    });

    it('OLLAMA_HOST points to host.docker.internal', () => {
      expect(raw.includes('host.docker.internal')).toBeTruthy();
    });
  });

  describe('install/docker-compose.yml', () => {
    const raw = loadYamlSimple('install/docker-compose.yml');

    it('port mapping is 1234 (not 3000)', () => {
      expect(raw.includes('1234')).toBeTruthy();
      expect(!raw.includes('3000')).toBeTruthy();
    });

    it('OLLAMA_HOST env var is present', () => {
      expect(raw.includes('OLLAMA_HOST')).toBeTruthy();
    });

    it('./data volume mount is present', () => {
      expect(raw.includes('./data')).toBeTruthy();
    });
  });
});
