/**
 * Config persistence tests — verifies the atomic write fix (task-1775851932380)
 *
 * Root cause: _writeToDisk() previously produced invalid JSON (append vs overwrite).
 * Fix: atomic write via tmp file + rename.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.agentic-service');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

let configModule;

async function freshImport() {
  // Dynamic import to get a fresh module (vitest caches, but we reload state)
  configModule = await import('../src/config.js');
  await configModule.reloadConfig();
  return configModule;
}

beforeEach(async () => {
  await fs.rm(CONFIG_PATH, { force: true });
  await fs.rm(CONFIG_PATH + '.tmp', { force: true });
  await freshImport();
});

afterEach(async () => {
  await fs.rm(CONFIG_PATH, { force: true });
  await fs.rm(CONFIG_PATH + '.tmp', { force: true });
});

describe('config.js — atomic write persistence', () => {
  it('setConfig writes valid JSON to disk', async () => {
    await configModule.setConfig({ testField: 'hello' });
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw); // should not throw
    expect(parsed.testField).toBe('hello');
  });

  it('no .tmp file remains after successful write', async () => {
    await configModule.setConfig({ x: 1 });
    await expect(fs.access(CONFIG_PATH + '.tmp')).rejects.toThrow();
  });

  it('multiple sequential writes produce valid JSON each time', async () => {
    for (let i = 0; i < 5; i++) {
      await configModule.setConfig({ iteration: i });
      // Verify via reloadConfig (reads from disk) to avoid race with parallel test files
      await configModule.reloadConfig();
      const config = await configModule.getConfig();
      expect(config.iteration).toBe(i);
    }
  });

  it('deep merge preserves nested objects across writes', async () => {
    await configModule.setConfig({ stt: { provider: 'custom', lang: 'en' } });
    await configModule.setConfig({ tts: { voice: 'nova' } });
    const config = await configModule.getConfig();
    expect(config.stt.provider).toBe('custom');
    expect(config.stt.lang).toBe('en');
    expect(config.tts.voice).toBe('nova');
  });

  it('_hardware and _profileSource are stripped from disk', async () => {
    await configModule.setConfig({ _hardware: { gpu: 'nvidia' }, _profileSource: 'auto', keep: true });
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed._hardware).toBeUndefined();
    expect(parsed._profileSource).toBeUndefined();
    expect(parsed.keep).toBe(true);
  });

  it('reloadConfig reads fresh data from disk', async () => {
    await configModule.setConfig({ before: true });
    // Write directly to disk bypassing cache
    const current = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf8'));
    current.injected = 'yes';
    await fs.writeFile(CONFIG_PATH, JSON.stringify(current, null, 2));
    await configModule.reloadConfig();
    const config = await configModule.getConfig();
    expect(config.injected).toBe('yes');
  });

  it('getConfig returns defaults when config file is missing', async () => {
    await fs.rm(CONFIG_PATH, { force: true });
    await configModule.reloadConfig();
    const config = await configModule.getConfig();
    expect(config).toHaveProperty('modelPool');
    expect(config).toHaveProperty('assignments');
    expect(config).toHaveProperty('ollamaHost');
  });

  it('getConfig returns defaults when config file contains invalid JSON', async () => {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    await fs.writeFile(CONFIG_PATH, '{{not valid json');
    await configModule.reloadConfig();
    const config = await configModule.getConfig();
    expect(config).toHaveProperty('modelPool');
    expect(config).toHaveProperty('assignments');
  });
});

describe('config.js — listener notifications', () => {
  it('onConfigChange listener fires on setConfig', async () => {
    let received = null;
    const unsub = configModule.onConfigChange(cfg => { received = cfg; });
    await configModule.setConfig({ notify: true });
    expect(received).not.toBeNull();
    expect(received.notify).toBe(true);
    unsub();
  });

  it('unsubscribed listener does not fire', async () => {
    let count = 0;
    const unsub = configModule.onConfigChange(() => { count++; });
    unsub();
    await configModule.setConfig({ x: 1 });
    expect(count).toBe(0);
  });
});
