/**
 * Config persistence edge-case tests for task-1775851932380
 * Verifies atomic write pattern in _writeToDisk() and PUT/GET round-trip
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

vi.mock('../../src/server/brain.js', () => ({ chat: vi.fn() }));
vi.mock('../../src/detector/hardware.js', () => ({
  detect: vi.fn().mockResolvedValue({ platform: 'darwin', arch: 'arm64', gpu: {}, memory: 16, cpu: {} })
}));
vi.mock('../../src/runtime/stt.js', () => ({ init: vi.fn(), transcribe: vi.fn() }));
vi.mock('../../src/runtime/tts.js', () => ({ init: vi.fn(), synthesize: vi.fn() }));

import { startServer } from '../../src/server/api.js';
import { reloadConfig } from '../../src/config.js';

const CONFIG_DIR = path.join(os.homedir(), '.agentic-service');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

let server, baseUrl;

async function req(method, p, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return fetch(`${baseUrl}${p}`, opts);
}

beforeEach(async () => {
  const port = 3400 + Math.floor(Math.random() * 100);
  server = await startServer(port);
  baseUrl = `http://localhost:${port}`;
  await fs.rm(CONFIG_PATH, { force: true });
  await fs.rm(CONFIG_PATH + '.tmp', { force: true });
  // Reset config cache to ensure clean state between test files
  await reloadConfig();
});

afterEach(() => server?.close());

describe('config persistence — atomic write', () => {
  it('no .tmp file left after PUT', async () => {
    await req('PUT', '/api/config', { atomicTest: true });
    let tmpExists = true;
    try {
      await fs.access(CONFIG_PATH + '.tmp');
    } catch {
      tmpExists = false;
    }
    expect(tmpExists).toBe(false);
  });

  it('config file is valid JSON after PUT', async () => {
    await req('PUT', '/api/config', { jsonValid: 'yes' });
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('config file is pretty-printed (2-space indent)', async () => {
    await req('PUT', '/api/config', { pretty: true });
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    // Pretty-printed JSON has newlines and indentation
    expect(raw).toContain('\n');
    expect(raw).toMatch(/^\{\n {2}/);
  });
});

describe('config persistence — deep merge', () => {
  it('PUT merges nested objects instead of replacing', async () => {
    await req('PUT', '/api/config', { nested: { a: 1, b: 2 } });
    await req('PUT', '/api/config', { nested: { b: 3, c: 4 } });
    const config = await (await req('GET', '/api/config')).json();
    expect(config.nested).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('PUT preserves default keys not in update', async () => {
    await req('PUT', '/api/config', { customKey: 'value' });
    const config = await (await req('GET', '/api/config')).json();
    // Default keys should still be present
    expect(config).toHaveProperty('modelPool');
    expect(config).toHaveProperty('assignments');
    expect(config.customKey).toBe('value');
  });
});

describe('config persistence — _hardware stripping', () => {
  it('_hardware key is not persisted to disk', async () => {
    // _hardware is an internal key that should be stripped before writing
    await req('PUT', '/api/config', { _hardware: { fake: true }, visible: 1 });
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed).not.toHaveProperty('_hardware');
    expect(parsed).toHaveProperty('visible');
  });

  it('_profileSource key is not persisted to disk', async () => {
    await req('PUT', '/api/config', { _profileSource: 'test', visible: 2 });
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed).not.toHaveProperty('_profileSource');
    expect(parsed).toHaveProperty('visible');
  });
});

describe('config persistence — sequential writes', () => {
  it('multiple rapid PUTs all persist correctly', async () => {
    // Rapid sequential writes should not corrupt the file
    for (let i = 0; i < 5; i++) {
      await req('PUT', '/api/config', { seq: i });
    }
    const config = await (await req('GET', '/api/config')).json();
    expect(config.seq).toBe(4); // last write wins
    // Verify disk is also correct
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    expect(JSON.parse(raw).seq).toBe(4);
  });
});
