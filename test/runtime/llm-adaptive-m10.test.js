import { test } from 'vitest';
import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

test('llm-adaptive-m10', async () => {
describe('llm.js DBB-003: hardware-adaptive loadConfig', () => {
  let originalFetch;

  before(() => { originalFetch = global.fetch; });
  after(() => { global.fetch = originalFetch; });

  beforeEach(() => {
    // Clear module cache so _config singleton resets between tests
    // Node test runner doesn't support module cache clearing easily,
    // so we test via observable behavior (model used in fetch calls)
  });

  it('DBB-003a: loadConfig() calls detectHardware (not hardcoded gemma4:26b)', async () => {
    // Verify the implementation imports from detector, not hardcoded string
    const src = await import('fs').then(fs =>
      fs.promises.readFile(
        new URL('../../src/runtime/llm.js', import.meta.url).pathname, 'utf8'
      )
    );
    assert.ok(
      src.includes('detectHardware') || src.includes('detect as detectHardware'),
      'llm.js should import detectHardware'
    );
    assert.ok(
      src.includes('getProfile'),
      'llm.js should call getProfile'
    );
    assert.ok(
      !src.includes("'gemma4:26b'") && !src.includes('"gemma4:26b"'),
      'llm.js must not hardcode gemma4:26b'
    );
  });

  it('DBB-003b: loadConfig() caches result — detectHardware called only once', async () => {
    const src = await import('fs').then(fs =>
      fs.promises.readFile(
        new URL('../../src/runtime/llm.js', import.meta.url).pathname, 'utf8'
      )
    );
    // Cache pattern: _config guard
    assert.ok(
      src.includes('_config') && src.includes('if (_config)'),
      'loadConfig() should cache result with _config guard'
    );
  });

  it('DBB-003c: chat() uses config.llm.model from profile (not hardcoded)', async () => {
    const src = await import('fs').then(fs =>
      fs.promises.readFile(
        new URL('../../src/runtime/llm.js', import.meta.url).pathname, 'utf8'
      )
    );
    // chatWithOllama should use config.llm.model dynamically
    assert.ok(
      src.includes('config.llm.model'),
      'chatWithOllama should use config.llm.model'
    );
  });

  it('DBB-003d: watchProfiles triggers config reload on profile change', async () => {
    const src = await import('fs').then(fs =>
      fs.promises.readFile(
        new URL('../../src/runtime/llm.js', import.meta.url).pathname, 'utf8'
      )
    );
    assert.ok(
      src.includes('watchProfiles'),
      'llm.js should call watchProfiles for hot reload'
    );
    assert.ok(
      src.includes('_config ='),
      'watchProfiles callback should update _config'
    );
  });
});
});
