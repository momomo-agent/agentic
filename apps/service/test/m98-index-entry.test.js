import { describe, it, assert } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

describe('DBB-001/002: src/index.js entry point', () => {
  const indexPath = resolve(ROOT, 'src/index.js');

  it('src/index.js file exists', () => {
    const content = readFileSync(indexPath, 'utf8');
    assert.ok(content.length > 0, 'src/index.js should not be empty');
  });

  it('exports startServer', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.startServer, 'function', 'startServer should be a function');
  });

  it('exports createApp', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.createApp, 'function', 'createApp should be a function');
  });

  it('exports stopServer', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.stopServer, 'function', 'stopServer should be a function');
  });

  it('exports detect (detector)', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.detect, 'function', 'detect should be a function');
  });

  it('exports getProfile (detector)', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.getProfile, 'function', 'getProfile should be a function');
  });

  it('exports matchProfile (detector)', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.matchProfile, 'function', 'matchProfile should be a function');
  });

  it('exports ensureOllama (detector)', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.ensureOllama, 'function', 'ensureOllama should be a function');
  });

  it('exports chat (runtime/server)', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.chat, 'function', 'chat should be a function');
  });

  it('exports stt namespace', async () => {
    const mod = await import(indexPath);
    assert.ok(mod.stt, 'stt namespace should exist');
    assert.strictEqual(typeof mod.stt, 'object', 'stt should be an object namespace');
  });

  it('exports tts namespace', async () => {
    const mod = await import(indexPath);
    assert.ok(mod.tts, 'tts namespace should exist');
    assert.strictEqual(typeof mod.tts, 'object', 'tts should be an object namespace');
  });

  it('exports embed', async () => {
    const mod = await import(indexPath);
    assert.strictEqual(typeof mod.embed, 'function', 'embed should be a function');
  });

  it('package.json main points to src/index.js', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    assert.strictEqual(pkg.main, 'src/index.js', 'package.json main should be src/index.js');
  });

  it('DBB-001: exported keys include startServer, detector, runtime', async () => {
    const mod = await import(indexPath);
    const keys = Object.keys(mod);
    assert.ok(keys.includes('startServer'), 'should export startServer');
    assert.ok(keys.includes('detect'), 'should export detect (detector)');
    assert.ok(keys.includes('chat'), 'should export chat (runtime)');
    // Verify none are undefined
    for (const key of keys) {
      assert.ok(mod[key] !== undefined, `export "${key}" should not be undefined`);
    }
  });
});
