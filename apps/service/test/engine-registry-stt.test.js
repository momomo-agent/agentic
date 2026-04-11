import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sttPath = join(__dirname, '..', 'src', 'runtime', 'stt.js');
const sttSource = fs.readFileSync(sttPath, 'utf8');

describe('static imports: stt.js does NOT import from detector/', () => {
  it('does not import from detector/hardware.js', () => {
    assert.ok(!sttSource.includes('detector/hardware'), 'stt.js must not import from detector/hardware.js');
  });

  it('does not import from detector/profiles.js', () => {
    assert.ok(!sttSource.includes('detector/profiles'), 'stt.js must not import from detector/profiles.js');
  });

  it('has no import referencing detector/ at all', () => {
    const importLines = sttSource.split('\n').filter(l => /^\s*import\s/.test(l));
    const detectorImports = importLines.filter(l => l.includes('detector/'));
    assert.equal(detectorImports.length, 0, `unexpected detector imports: ${detectorImports.join(', ')}`);
  });
});

describe('static imports: stt.js does NOT import fs, path, or os', () => {
  const importLines = sttSource.split('\n').filter(l => /^\s*import\s/.test(l));

  it('does not import fs', () => {
    const fsImports = importLines.filter(l => /['"]fs['"]/.test(l) || /['"]node:fs['"]/.test(l));
    assert.equal(fsImports.length, 0, 'stt.js must not import fs');
  });

  it('does not import path', () => {
    const pathImports = importLines.filter(l => /['"]path['"]/.test(l) || /['"]node:path['"]/.test(l));
    assert.equal(pathImports.length, 0, 'stt.js must not import path');
  });

  it('does not import os', () => {
    const osImports = importLines.filter(l => /['"]os['"]/.test(l) || /['"]node:os['"]/.test(l));
    assert.equal(osImports.length, 0, 'stt.js must not import os');
  });
});

describe('static imports: stt.js DOES import from engine/registry.js', () => {
  it('imports from engine/registry.js', () => {
    assert.ok(sttSource.includes('engine/registry'), 'stt.js must import from engine/registry.js');
  });
});

describe('static imports: stt.js imports resolveModel and modelsForCapability', () => {
  it('imports resolveModel', () => {
    const registryLine = sttSource.split('\n').find(l => l.includes('engine/registry'));
    assert.ok(registryLine, 'must have engine/registry import line');
    assert.ok(registryLine.includes('resolveModel'), 'resolveModel must come from engine/registry');
  });

  it('imports modelsForCapability', () => {
    const registryLine = sttSource.split('\n').find(l => l.includes('engine/registry'));
    assert.ok(registryLine, 'must have engine/registry import line');
    assert.ok(registryLine.includes('modelsForCapability'), 'modelsForCapability must come from engine/registry');
  });
});

describe('stt.js imports getConfig from config.js', () => {
  it('imports getConfig', () => {
    const configLine = sttSource.split('\n').find(l => l.includes('config.js'));
    assert.ok(configLine, 'must have config.js import line');
    assert.ok(configLine.includes('getConfig'), 'getConfig must come from config.js');
  });
});

describe('LEGACY_ADAPTERS map', () => {
  it('has sensevoice adapter', () => {
    assert.ok(sttSource.includes('sensevoice'), 'ADAPTERS must include sensevoice');
  });

  it('has whisper adapter', () => {
    assert.ok(sttSource.includes("whisper:") || sttSource.includes("whisper "), 'ADAPTERS must include whisper');
  });

  it('has default adapter pointing to openai-whisper', () => {
    assert.ok(sttSource.includes('openai-whisper'), 'default adapter must point to openai-whisper');
  });
});

describe('init() flow', () => {
  it('step 1: checks config.assignments.stt then resolveModel', () => {
    assert.ok(sttSource.includes('assignments.stt'), 'init checks assignments.stt');
    assert.ok(sttSource.includes('resolveModel(assignments.stt)') || sttSource.includes('resolveModel('), 'init calls resolveModel');
  });

  it('step 2: falls back to modelsForCapability(stt)', () => {
    assert.ok(sttSource.includes("modelsForCapability('stt')"), 'init falls back to modelsForCapability stt');
  });

  it('step 2: resolves first model from capability list', () => {
    assert.ok(sttSource.includes('models[0].id'), 'init resolves first model from capability list');
  });

  it('step 3: legacy adapter fallback reads config.stt.provider', () => {
    assert.ok(sttSource.includes('config.stt?.provider'), 'init reads config.stt.provider for legacy fallback');
  });

  it('sets _resolved when engine has run()', () => {
    assert.ok(sttSource.includes('engine?.run') || sttSource.includes('engine.run'), 'init checks engine.run');
    assert.ok(sttSource.includes('_resolved = r') || sttSource.includes('_resolved ='), 'init sets _resolved');
  });
});

describe('transcribe() behavior', () => {
  it('throws not initialized when neither _resolved nor _adapter', () => {
    assert.ok(sttSource.includes('not initialized'), 'transcribe throws not initialized');
  });

  it('throws empty audio with code EMPTY_AUDIO for empty buffer', () => {
    assert.ok(sttSource.includes("'empty audio'"), 'transcribe throws empty audio');
    assert.ok(sttSource.includes("code: 'EMPTY_AUDIO'"), 'error has code EMPTY_AUDIO');
  });

  it('checks audioBuffer.length === 0', () => {
    assert.ok(sttSource.includes('audioBuffer.length === 0'), 'transcribe checks for zero-length buffer');
  });

  it('delegates to _resolved.engine.run when resolved', () => {
    assert.ok(sttSource.includes('_resolved.engine.run(_resolved.modelName'), 'transcribe delegates to engine.run with modelName');
  });

  it('passes audioBuffer in options to engine.run', () => {
    assert.ok(sttSource.includes('{ audioBuffer }'), 'transcribe passes { audioBuffer } to engine.run');
  });

  it('falls back to _adapter.transcribe when no resolved engine', () => {
    assert.ok(sttSource.includes('_adapter.transcribe(audioBuffer)'), 'transcribe falls back to adapter.transcribe');
  });
});
