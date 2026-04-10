import { describe, it, assert } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const ROOT = resolve(import.meta.dirname, '..');

function loadYaml(relPath) {
  const raw = readFileSync(resolve(ROOT, relPath), 'utf8');
  return parse(raw);
}

describe('DBB-003/004/005: Docker port, OLLAMA_HOST, data volume', () => {
  describe('root docker-compose.yml', () => {
    let config;
    it('parses without error', () => {
      config = loadYaml('docker-compose.yml');
      assert.ok(config, 'should parse');
    });

    it('DBB-003: port mapping is 1234:1234 (not 3000)', () => {
      const svc = config.services?.['agentic-service'] || Object.values(config.services)[0];
      const ports = svc.ports || [];
      const portStr = ports.join(' ');
      assert.ok(portStr.includes('1234'), `port mapping should include 1234, got: ${portStr}`);
      assert.ok(!portStr.includes('3000'), `port mapping should NOT include 3000, got: ${portStr}`);
    });

    it('DBB-004: OLLAMA_HOST env var is present', () => {
      const svc = config.services?.['agentic-service'] || Object.values(config.services)[0];
      const env = svc.environment || [];
      const envStr = Array.isArray(env) ? env.join(' ') : JSON.stringify(env);
      assert.ok(envStr.includes('OLLAMA_HOST'), `environment should include OLLAMA_HOST, got: ${envStr}`);
    });

    it('DBB-005: ./data volume mount is present', () => {
      const svc = config.services?.['agentic-service'] || Object.values(config.services)[0];
      const volumes = svc.volumes || [];
      const volStr = Array.isArray(volumes) ? volumes.join(' ') : JSON.stringify(volumes);
      assert.ok(volStr.includes('./data'), `volumes should include ./data, got: ${volStr}`);
    });
  });

  describe('install/docker-compose.yml', () => {
    let config;
    it('parses without error', () => {
      config = loadYaml('install/docker-compose.yml');
      assert.ok(config, 'should parse');
    });

    it('port mapping is 1234:1234', () => {
      const svc = config.services?.['agentic-service'] || Object.values(config.services)[0];
      const ports = svc.ports || [];
      const portStr = ports.join(' ');
      assert.ok(portStr.includes('1234'), `port mapping should include 1234, got: ${portStr}`);
      assert.ok(!portStr.includes('3000'), `port mapping should NOT include 3000, got: ${portStr}`);
    });

    it('OLLAMA_HOST env var is present', () => {
      const svc = config.services?.['agentic-service'] || Object.values(config.services)[0];
      const env = svc.environment || [];
      const envStr = Array.isArray(env) ? env.join(' ') : JSON.stringify(env);
      assert.ok(envStr.includes('OLLAMA_HOST'), `environment should include OLLAMA_HOST, got: ${envStr}`);
    });

    it('./data volume mount is present', () => {
      const svc = config.services?.['agentic-service'] || Object.values(config.services)[0];
      const volumes = svc.volumes || [];
      const volStr = Array.isArray(volumes) ? volumes.join(' ') : JSON.stringify(volumes);
      assert.ok(volStr.includes('./data'), `volumes should include ./data, got: ${volStr}`);
    });
  });
});
