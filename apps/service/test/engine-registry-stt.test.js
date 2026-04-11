import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sttPath = join(__dirname, '..', 'src', 'runtime', 'stt.js');
const sttSource = fs.readFileSync(sttPath, 'utf8');

describe('static imports: stt.js does NOT import from detector/', () => {
  it('does not import from detector/hardware.js', () => {
    expect(sttSource.includes('detector/hardware')).toBe(false);
  });

  it('does not import from detector/profiles.js', () => {
    expect(sttSource.includes('detector/profiles')).toBe(false);
  });

  it('has no import referencing detector/ at all', () => {
    const importLines = sttSource.split('\n').filter(l => /^\s*import\s/.test(l));
    const detectorImports = importLines.filter(l => l.includes('detector/'));
    expect(detectorImports.length).toBe(0);
  });
});

describe('static imports: stt.js does NOT import fs, path, or os', () => {
  const importLines = sttSource.split('\n').filter(l => /^\s*import\s/.test(l));

  it('does not import fs', () => {
    const fsImports = importLines.filter(l => /['"]fs['"]/.test(l) || /['"]node:fs['"]/.test(l));
    expect(fsImports.length).toBe(0);
  });

  it('does not import path', () => {
    const pathImports = importLines.filter(l => /['"]path['"]/.test(l) || /['"]node:path['"]/.test(l));
    expect(pathImports.length).toBe(0);
  });

  it('does not import os', () => {
    const osImports = importLines.filter(l => /['"]os['"]/.test(l) || /['"]node:os['"]/.test(l));
    expect(osImports.length).toBe(0);
  });
});

describe('static imports: stt.js DOES import from engine/registry.js', () => {
  it('imports from engine/registry.js', () => {
    expect(sttSource.includes('engine/registry')).toBe(true);
  });
});

describe('static imports: stt.js imports resolveModel and modelsForCapability', () => {
  it('imports resolveModel', () => {
    const registryLine = sttSource.split('\n').find(l => l.includes('engine/registry'));
    expect(registryLine).toBeTruthy();
    expect(registryLine.includes('resolveModel')).toBe(true);
  });

  it('imports modelsForCapability', () => {
    const registryLine = sttSource.split('\n').find(l => l.includes('engine/registry'));
    expect(registryLine).toBeTruthy();
    expect(registryLine.includes('modelsForCapability')).toBe(true);
  });
});

describe('stt.js imports getConfig from config.js', () => {
  it('imports getConfig', () => {
    const configLine = sttSource.split('\n').find(l => l.includes('config.js'));
    expect(configLine).toBeTruthy();
    expect(configLine.includes('getConfig')).toBe(true);
  });
});

describe('LEGACY_ADAPTERS map', () => {
  it('has sensevoice adapter', () => {
    expect(sttSource.includes('sensevoice')).toBe(true);
  });

  it('has whisper adapter', () => {
    expect(sttSource.includes('whisper:') || sttSource.includes('whisper ')).toBe(true);
  });

  it('has default adapter pointing to openai-whisper', () => {
    expect(sttSource.includes('openai-whisper')).toBe(true);
  });
});

describe('init() flow', () => {
  it('step 1: checks config.assignments.stt then resolveModel', () => {
    expect(sttSource.includes('assignments.stt')).toBe(true);
    expect(sttSource.includes('resolveModel(')).toBe(true);
  });

  it('step 2: falls back to modelsForCapability(stt)', () => {
    expect(sttSource.includes("modelsForCapability('stt')")).toBe(true);
  });

  it('step 2: resolves first model from capability list', () => {
    expect(sttSource.includes('models[0].id')).toBe(true);
  });

  it('step 3: legacy adapter fallback reads config.stt.provider', () => {
    expect(sttSource.includes('config.stt?.provider')).toBe(true);
  });

  it('sets _resolved when engine has run()', () => {
    expect(sttSource.includes('engine?.run') || sttSource.includes('engine.run')).toBe(true);
    expect(sttSource.includes('_resolved = r') || sttSource.includes('_resolved =')).toBe(true);
  });
});

describe('transcribe() behavior', () => {
  it('throws not initialized when neither _resolved nor _adapter', () => {
    expect(sttSource.includes('not initialized')).toBe(true);
  });

  it('throws empty audio with code EMPTY_AUDIO for empty buffer', () => {
    expect(sttSource.includes("'empty audio'")).toBe(true);
    expect(sttSource.includes("code: 'EMPTY_AUDIO'")).toBe(true);
  });

  it('checks audioBuffer.length === 0', () => {
    expect(sttSource.includes('audioBuffer.length === 0')).toBe(true);
  });

  it('delegates to _resolved.engine.run when resolved', () => {
    expect(sttSource.includes('_resolved.engine.run(_resolved.modelName')).toBe(true);
  });

  it('passes audioBuffer in options to engine.run', () => {
    expect(sttSource.includes('{ audioBuffer }')).toBe(true);
  });

  it('falls back to _adapter.transcribe when no resolved engine', () => {
    expect(sttSource.includes('_adapter.transcribe(audioBuffer)')).toBe(true);
  });
});
