import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const indexPath = resolve(ROOT, 'src/index.js');
const indexSrc = readFileSync(indexPath, 'utf8');

describe('DBB-001/002: src/index.js entry point', () => {
  it('src/index.js file exists and is non-empty', () => {
    expect(indexSrc.length > 0).toBeTruthy();
  });

  it('package.json main points to src/index.js', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.main).toBe('src/index.js');
  });

  it('exports startServer from server/api.js', () => {
    expect(indexSrc.includes('startServer')).toBeTruthy();
    expect(indexSrc.includes('server/api.js')).toBeTruthy();
  });

  it('exports createApp from server/api.js', () => {
    expect(indexSrc.includes('createApp')).toBeTruthy();
  });

  it('exports stopServer from server/api.js', () => {
    expect(indexSrc.includes('stopServer')).toBeTruthy();
  });

  it('exports detect from detector/hardware.js', () => {
    expect(indexSrc.includes('detect')).toBeTruthy();
    expect(indexSrc.includes('detector/hardware.js')).toBeTruthy();
  });

  it('exports getProfile from detector/profiles.js', () => {
    expect(indexSrc.includes('getProfile')).toBeTruthy();
    expect(indexSrc.includes('detector/profiles.js')).toBeTruthy();
  });

  it('exports matchProfile from detector/matcher.js', () => {
    expect(indexSrc.includes('matchProfile')).toBeTruthy();
    expect(indexSrc.includes('detector/matcher.js')).toBeTruthy();
  });

  it('exports ensureOllama from detector/ollama.js', () => {
    expect(indexSrc.includes('ensureOllama')).toBeTruthy();
    expect(indexSrc.includes('detector/ollama.js')).toBeTruthy();
  });

  it('exports chat (from core-bridge.js)', () => {
    expect(indexSrc.includes('chat')).toBeTruthy();
    expect(
      indexSrc.includes('server/core-bridge.js') || indexSrc.includes('server/brain.js') || indexSrc.includes('runtime/llm.js')
    ).toBeTruthy();
  });

  it('exports stt namespace', () => {
    expect(indexSrc.includes('stt')).toBeTruthy();
    expect(indexSrc.includes('runtime/stt.js')).toBeTruthy();
  });

  it('exports tts namespace', () => {
    expect(indexSrc.includes('tts')).toBeTruthy();
    expect(indexSrc.includes('runtime/tts.js')).toBeTruthy();
  });

  it('exports embed', () => {
    expect(indexSrc.includes('embed')).toBeTruthy();
    expect(indexSrc.includes('runtime/embed.js')).toBeTruthy();
  });

  it('DBB-001: key exports are present (startServer, detector, runtime)', () => {
    const requiredExports = ['startServer', 'detect', 'chat'];
    for (const name of requiredExports) {
      expect(indexSrc.includes(name)).toBeTruthy();
    }
  });

  it('DBB-002: uses valid ESM export syntax', () => {
    expect(/^export\s/m.test(indexSrc)).toBeTruthy();
    // No require() calls
    expect(indexSrc.includes('require(')).toBeFalsy();
  });
});
