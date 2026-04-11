/**
 * Engine Registry TTS Migration — task-1775887201640
 *
 * Run: npx vitest run test/engine-registry-tts.test.js
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const runtimeTtsSrc = fs.readFileSync(path.join(ROOT, 'src/runtime/tts.js'), 'utf8');
const engineTtsSrc = fs.readFileSync(path.join(ROOT, 'src/engine/tts.js'), 'utf8');

describe('tts.js static imports — Engine Registry migration', () => {
  it('does NOT import from detector/hardware.js', () => {
    expect(runtimeTtsSrc.includes('detector/hardware')).toBe(false);
  });

  it('does NOT import from detector/profiles.js', () => {
    expect(runtimeTtsSrc.includes('detector/profiles')).toBe(false);
  });

  it('does NOT import from any detector/ path', () => {
    expect(runtimeTtsSrc.match(/from\s+['"].*detector\//)).toBeNull();
  });

  it('does NOT import fs', () => {
    const hasFsImport = /import\s.*from\s+['"](?:node:)?fs['"]/.test(runtimeTtsSrc);
    expect(hasFsImport).toBe(false);
  });

  it('does NOT import path', () => {
    const hasPathImport = /import\s.*from\s+['"](?:node:)?path['"]/.test(runtimeTtsSrc);
    expect(hasPathImport).toBe(false);
  });

  it('does NOT import os', () => {
    const hasOsImport = /import\s.*from\s+['"](?:node:)?os['"]/.test(runtimeTtsSrc);
    expect(hasOsImport).toBe(false);
  });

  it('DOES import from engine/registry.js', () => {
    expect(runtimeTtsSrc.includes('engine/registry')).toBe(true);
  });

  it('imports resolveModel from engine/registry', () => {
    expect(runtimeTtsSrc.includes('resolveModel')).toBe(true);
    const registryLine = runtimeTtsSrc.split('\n').find(l => l.includes('engine/registry'));
    expect(registryLine.includes('resolveModel')).toBe(true);
  });

  it('imports modelsForCapability from engine/registry', () => {
    expect(runtimeTtsSrc.includes('modelsForCapability')).toBe(true);
    const registryLine = runtimeTtsSrc.split('\n').find(l => l.includes('engine/registry'));
    expect(registryLine.includes('modelsForCapability')).toBe(true);
  });

  it('imports getConfig from config.js', () => {
    const configLine = runtimeTtsSrc.split('\n').find(l => l.includes('config.js'));
    expect(configLine).toBeTruthy();
    expect(configLine.includes('getConfig')).toBe(true);
  });
});

describe('tts.js ADAPTERS map', () => {
  it('has macos-say adapter', () => {
    expect(runtimeTtsSrc.includes("'macos-say'")).toBe(true);
  });

  it('has piper adapter', () => {
    expect(runtimeTtsSrc.includes('piper')).toBe(true);
  });

  it('has kokoro adapter', () => {
    expect(runtimeTtsSrc.includes('kokoro')).toBe(true);
  });

  it('has elevenlabs adapter', () => {
    expect(runtimeTtsSrc.includes('elevenlabs')).toBe(true);
  });

  it('has openai-tts adapter', () => {
    expect(runtimeTtsSrc.includes('openai-tts')).toBe(true);
  });
});

describe('tts.js init() flow', () => {
  it('checks config.assignments.tts then resolveModel', () => {
    expect(runtimeTtsSrc.includes('assignments.tts')).toBe(true);
    expect(runtimeTtsSrc.includes('resolveModel(')).toBe(true);
  });

  it('falls back to modelsForCapability(tts)', () => {
    expect(runtimeTtsSrc.includes("modelsForCapability('tts')")).toBe(true);
  });

  it('legacy adapter fallback reads config.tts.provider', () => {
    expect(runtimeTtsSrc.includes('config.tts?.provider')).toBe(true);
  });
});

describe('tts.js synthesize() behavior', () => {
  it('throws not initialized when neither _resolved nor _adapter', () => {
    expect(runtimeTtsSrc.includes('not initialized')).toBe(true);
  });

  it('delegates to _resolved.engine.run when resolved', () => {
    expect(runtimeTtsSrc.includes('_resolved.engine.run(')).toBe(true);
  });

  it('falls back to _adapter.synthesize when no resolved engine', () => {
    expect(runtimeTtsSrc.includes('_adapter.synthesize(')).toBe(true);
  });
});

describe('engine/tts.js structure', () => {
  it('exports default with run function', () => {
    expect(engineTtsSrc.includes('export default')).toBe(true);
    expect(engineTtsSrc.includes('run')).toBe(true);
  });

  it('run dispatches to adapter based on model name', () => {
    expect(engineTtsSrc.includes('adapterMap') || engineTtsSrc.includes('ADAPTERS')).toBe(true);
  });

  it('run calls adapter.synthesize(input.text)', () => {
    expect(engineTtsSrc.includes('adapter.synthesize(input.text)')).toBe(true);
  });

  it('engine adapterMap covers expected backends', () => {
    expect(engineTtsSrc.includes("'macos-say'")).toBe(true);
    expect(engineTtsSrc.includes('piper')).toBe(true);
    expect(engineTtsSrc.includes('kokoro')).toBe(true);
    expect(engineTtsSrc.includes('elevenlabs')).toBe(true);
    expect(engineTtsSrc.includes('openai')).toBe(true);
  });
});

describe('TTS engine live import', () => {
  it('default export has run as a function', async () => {
    const mod = await import(path.join(ROOT, 'src/engine/tts.js'));
    const engine = mod.default;
    expect(typeof engine.run).toBe('function');
  });

  it('run() rejects with "Unknown TTS model" for bogus model', async () => {
    const mod = await import(path.join(ROOT, 'src/engine/tts.js'));
    const engine = mod.default;
    await expect(engine.run('nonexistent-model-xyz', { text: 'hello' })).rejects.toThrow('Unknown TTS model');
  });

  it('default export has status, models, recommended as functions', async () => {
    const mod = await import(path.join(ROOT, 'src/engine/tts.js'));
    const engine = mod.default;
    expect(typeof engine.status).toBe('function');
    expect(typeof engine.models).toBe('function');
    expect(typeof engine.recommended).toBe('function');
  });
});
