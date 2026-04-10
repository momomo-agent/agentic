/**
 * Config concurrent write tests — verifies the write mutex fix (task-1775852942421)
 *
 * Root cause: concurrent setConfig() calls sharing a single .tmp file caused
 * corrupt JSON or ENOENT on rename. Fix: _writeQueue serializes writes.
 */
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const TEMP_DIR = path.join(os.tmpdir(), `agentic-config-concurrent-${process.pid}`);
const CONFIG_PATH = path.join(TEMP_DIR, 'config.json');

let configModule;

beforeAll(async () => {
  process.env.AGENTIC_CONFIG_DIR = TEMP_DIR;
  await fs.mkdir(TEMP_DIR, { recursive: true });
});

afterAll(async () => {
  delete process.env.AGENTIC_CONFIG_DIR;
  await fs.rm(TEMP_DIR, { recursive: true, force: true });
});

async function freshImport() {
  vi.resetModules();
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

describe('config.js — concurrent write safety', () => {
  it('multiple concurrent setConfig calls all produce valid JSON', async () => {
    // Fire 10 concurrent writes — the old code would corrupt JSON here
    const writes = Array.from({ length: 10 }, (_, i) =>
      configModule.setConfig({ [`field_${i}`]: i })
    );
    await Promise.all(writes);

    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw); // must not throw
    expect(parsed).toHaveProperty('modelPool');
    expect(parsed).toHaveProperty('assignments');
  });

  it('concurrent writes preserve all values (no lost updates)', async () => {
    const writes = Array.from({ length: 5 }, (_, i) =>
      configModule.setConfig({ [`key_${i}`]: `value_${i}` })
    );
    await Promise.all(writes);

    const config = await configModule.getConfig();
    for (let i = 0; i < 5; i++) {
      expect(config[`key_${i}`]).toBe(`value_${i}`);
    }
  });

  it('no .tmp file remains after concurrent writes', async () => {
    const writes = Array.from({ length: 5 }, (_, i) =>
      configModule.setConfig({ [`c_${i}`]: i })
    );
    await Promise.all(writes);

    await expect(fs.access(CONFIG_PATH + '.tmp')).rejects.toThrow();
  });

  it('rapid setConfig + getConfig interleaving returns consistent state', async () => {
    // Simulate rapid API calls that read and write concurrently
    const ops = [];
    for (let i = 0; i < 5; i++) {
      ops.push(configModule.setConfig({ counter: i }));
      ops.push(configModule.getConfig());
    }
    await Promise.all(ops);

    // Final state on disk must be valid JSON
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    expect(typeof parsed.counter).toBe('number');
  });

  it('concurrent deep merge writes do not corrupt nested objects', async () => {
    await configModule.setConfig({ nested: { a: 1 } });

    const writes = [
      configModule.setConfig({ nested: { b: 2 } }),
      configModule.setConfig({ nested: { c: 3 } }),
      configModule.setConfig({ nested: { d: 4 } }),
    ];
    await Promise.all(writes);

    const config = await configModule.getConfig();
    // All nested keys should be present due to deep merge
    expect(config.nested.a).toBe(1);
    expect(config.nested.b).toBe(2);
    expect(config.nested.c).toBe(3);
    expect(config.nested.d).toBe(4);
  });

  it('listeners fire for each concurrent write', async () => {
    let callCount = 0;
    const unsub = configModule.onConfigChange(() => { callCount++; });

    const writes = Array.from({ length: 3 }, (_, i) =>
      configModule.setConfig({ [`l_${i}`]: i })
    );
    await Promise.all(writes);

    expect(callCount).toBe(3);
    unsub();
  });
});
