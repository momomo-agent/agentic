/**
 * Engine Registry TTS Migration — task-1775887201640
 *
 * Verifies that tts.js has been migrated to use the Engine Registry
 * (engine/registry.js) and that the TTS engine (engine/tts.js) conforms
 * to the engine contract.
 *
 * Run: node --test --test-timeout=30000 test/engine-registry-tts.test.js
 */
import { test } from 'vitest';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const runtimeTtsSrc = fs.readFileSync(path.join(ROOT, 'src/runtime/tts.js'), 'utf8');
const engineTtsSrc = fs.readFileSync(path.join(ROOT, 'src/engine/tts.js'), 'utf8');

test('engine-registry-tts', { timeout: 30_000 }, async () => {

// ─── Static import checks on src/runtime/tts.js ───

describe('tts.js static imports — Engine Registry migration', () => {

  it('does NOT import from detector/hardware.js', () => {
    assert.ok(
      !runtimeTtsSrc.includes('detector/hardware'),
      'tts.js should not import from detector/hardware.js after migration',
    );
  });

  it('does NOT import from detector/profiles.js', () => {
    assert.ok(
      !runtimeTtsSrc.includes('detector/profiles'),
      'tts.js should not import from detector/profiles.js after migration',
    );
  });

  it('does NOT import from any detector/ path', () => {
    assert.ok(
      !runtimeTtsSrc.includes("from '") || !runtimeTtsSrc.match(/from\s+['"].*detector\//),
      'tts.js should not import from detector/ at all',
    );
  });

  it('does NOT import fs', () => {
    // Check for import of 'fs' or 'node:fs' as a module specifier
    const hasFsImport = /import\s.*from\s+['"](?:node:)?fs['"]/.test(runtimeTtsSrc);
    assert.ok(!hasFsImport, 'tts.js should not import fs');
  });

  it('does NOT import path', () => {
    const hasPathImport = /import\s.*from\s+['"](?:node:)?path['"]/.test(runtimeTtsSrc);
    assert.ok(!hasPathImport, 'tts.js should not import path');
  });

  it('does NOT import os', () => {
    const hasOsImport = /import\s.*from\s+['"](?:node:)?os['"]/.test(runtimeTtsSrc);
    assert.ok(!hasOsImport, 'tts.js should not import os');
  });

  it('DOES import from engine/registry.js', () => {
    assert.ok(
      runtimeTtsSrc.includes('engine/registry'),
      'tts.js must import from engine/registry.js',
    );
  });

  it('imports resolveModel from engine/registry', () => {
    assert.ok(
      runtimeTtsSrc.includes('resolveModel'),
      'tts.js must import resolveModel',
    );
    // Verify it comes from the registry import line
    const registryLine = runtimeTtsSrc.split('\n').find(l => l.includes('engine/registry'));
    assert.ok(registryLine.includes('resolveModel'), 'resolveModel must come from engine/registry');
  });

  it('imports modelsForCapability from engine/registry', () => {
    assert.ok(
      runtimeTtsSrc.includes('modelsForCapability'),
      'tts.js must import modelsForCapability',
    );
    const registryLine = runtimeTtsSrc.split('\n').find(l => l.includes('engine/registry'));
    assert.ok(registryLine.includes('modelsForCapability'), 'modelsForCapability must come from engine/registry');
  });

  it('imports getConfig from config.js', () => {
    const configLine = runtimeTtsSrc.split('\n').find(l => l.includes('getConfig'));
    assert.ok(configLine, 'tts.js must import getConfig');
    assert.ok(configLine.includes('config'), 'getConfig must come from config module');
  });
});

// ─── Runtime tts.js structure checks ───

describe('tts.js runtime structure', () => {

  it('has ADAPTERS map with expected keys', () => {
    for (const key of ['macos-say', 'piper', 'kokoro', 'elevenlabs', 'openai', 'default']) {
      assert.ok(
        runtimeTtsSrc.includes(`'${key}'`) || runtimeTtsSrc.includes(`${key}:`),
        `ADAPTERS map should contain '${key}'`,
      );
    }
  });

  it('init() checks config.assignments.tts first', () => {
    assert.ok(runtimeTtsSrc.includes('assignments.tts'), 'init should check assignments.tts');
  });

  it('init() calls resolveModel for assigned model', () => {
    // The pattern: resolveModel(assignments.tts)
    assert.ok(
      runtimeTtsSrc.includes('resolveModel(assignments.tts)'),
      'init should call resolveModel with the assigned tts model',
    );
  });

  it('init() falls back to modelsForCapability("tts")', () => {
    assert.ok(
      runtimeTtsSrc.includes("modelsForCapability('tts')") || runtimeTtsSrc.includes('modelsForCapability("tts")'),
      'init should fall back to modelsForCapability for tts',
    );
  });

  it('init() checks engine.run exists before setting _resolved', () => {
    assert.ok(
      runtimeTtsSrc.includes('engine?.run') || runtimeTtsSrc.includes('.engine.run'),
      'init should verify engine has run() before resolving',
    );
  });

  it('init() has legacy adapter fallback using platform detection', () => {
    assert.ok(runtimeTtsSrc.includes("process.platform === 'darwin'"), 'should detect darwin for macos-say fallback');
    assert.ok(runtimeTtsSrc.includes('ADAPTERS.default'), 'should fall back to ADAPTERS.default');
  });

  it('synthesize() throws "not initialized" when neither _resolved nor _adapter', () => {
    assert.ok(runtimeTtsSrc.includes("'not initialized'"), 'synthesize must throw not initialized');
  });

  it('synthesize() throws "text required" with code EMPTY_TEXT for empty text', () => {
    assert.ok(runtimeTtsSrc.includes("'text required'"), 'synthesize must throw text required');
    assert.ok(runtimeTtsSrc.includes("code: 'EMPTY_TEXT'"), 'error must have code EMPTY_TEXT');
  });

  it('synthesize() guards whitespace-only text via trim()', () => {
    assert.ok(runtimeTtsSrc.includes('.trim()'), 'synthesize must trim text');
  });

  it('synthesize() delegates to _resolved.engine.run when resolved', () => {
    assert.ok(
      runtimeTtsSrc.includes('_resolved.engine.run('),
      'synthesize should call _resolved.engine.run()',
    );
  });

  it('synthesize() delegates to _adapter.synthesize when using legacy adapter', () => {
    assert.ok(
      runtimeTtsSrc.includes('_adapter.synthesize('),
      'synthesize should call _adapter.synthesize() for legacy path',
    );
  });
});

// ─── TTS Engine (src/engine/tts.js) contract checks ───

describe('TTS engine (engine/tts.js) — engine contract', () => {

  it('has run() method in source', () => {
    assert.ok(
      engineTtsSrc.includes('async run('),
      'TTS engine must have async run() method',
    );
  });

  it('run() accepts modelName and input parameters', () => {
    assert.ok(
      engineTtsSrc.includes('run(modelName, input)'),
      'run() signature must be run(modelName, input)',
    );
  });

  it('run() throws "Unknown TTS model" for unrecognized modelName', () => {
    assert.ok(
      engineTtsSrc.includes('Unknown TTS model'),
      'run() must throw for unknown model names',
    );
  });

  it('has status() method', () => {
    assert.ok(
      engineTtsSrc.includes('async status()') || engineTtsSrc.includes('status()'),
      'TTS engine must have status() method',
    );
  });

  it('has models() method', () => {
    assert.ok(
      engineTtsSrc.includes('async models()') || engineTtsSrc.includes('models()'),
      'TTS engine must have models() method',
    );
  });

  it('has recommended() method', () => {
    assert.ok(
      engineTtsSrc.includes('recommended()'),
      'TTS engine must have recommended() method',
    );
  });

  it('run() loads adapter from adapterMap and calls adapter.synthesize(input.text)', () => {
    assert.ok(engineTtsSrc.includes('adapterMap'), 'run() should use adapterMap');
    assert.ok(engineTtsSrc.includes('adapter.synthesize(input.text)'), 'run() should call adapter.synthesize(input.text)');
  });

  it('engine adapterMap covers expected backends', () => {
    for (const backend of ['macos-say', 'piper', 'kokoro', 'elevenlabs', 'openai']) {
      assert.ok(
        engineTtsSrc.includes(`'${backend}'`) || engineTtsSrc.includes(`${backend}:`),
        `engine adapterMap should include '${backend}'`,
      );
    }
  });
});

// ─── Live import of TTS engine to verify run() throws ───

describe('TTS engine live import', () => {

  it('default export has run as a function', async () => {
    const mod = await import(path.join(ROOT, 'src/engine/tts.js'));
    const engine = mod.default;
    assert.equal(typeof engine.run, 'function', 'engine.run must be a function');
  });

  it('run() rejects with "Unknown TTS model" for bogus model', async () => {
    const mod = await import(path.join(ROOT, 'src/engine/tts.js'));
    const engine = mod.default;
    await assert.rejects(
      () => engine.run('nonexistent-model-xyz', { text: 'hello' }),
      (err) => {
        assert.ok(err.message.includes('Unknown TTS model'), `Expected "Unknown TTS model" but got: ${err.message}`);
        return true;
      },
    );
  });

  it('default export has status, models, recommended as functions', async () => {
    const mod = await import(path.join(ROOT, 'src/engine/tts.js'));
    const engine = mod.default;
    assert.equal(typeof engine.status, 'function');
    assert.equal(typeof engine.models, 'function');
    assert.equal(typeof engine.recommended, 'function');
  });
});

}); // end test wrapper
