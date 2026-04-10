/**
 * Tests for task-1775858361684: Add voice adapter API signatures to ARCHITECTURE.md
 * Verifies that ARCHITECTURE.md documents all voice adapter signatures
 * and that they match the actual source code exports.
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const VOICE_DIR = path.join(SRC, 'runtime/adapters/voice');

describe('ARCHITECTURE.md voice adapter API signatures', () => {
  let archDoc;

  it('ARCHITECTURE.md contains §11 Runtime Adapters section', async () => {
    archDoc = await fs.readFile(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
    expect(archDoc).toContain('### 11. Runtime Adapters');
  });

  it('documents all STT adapters with transcribe signature', async () => {
    archDoc = archDoc || await fs.readFile(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
    expect(archDoc).toContain('sensevoice.transcribe(buffer)');
    expect(archDoc).toContain('whisper.transcribe(buffer)');
    expect(archDoc).toContain('openaiWhisper.transcribe(buffer)');
  });

  it('documents all TTS adapters with synthesize signature', async () => {
    archDoc = archDoc || await fs.readFile(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
    expect(archDoc).toContain('kokoro.synthesize(text)');
    expect(archDoc).toContain('piper.synthesize(text)');
    expect(archDoc).toContain('openaiTts.synthesize(text)');
    expect(archDoc).toContain('elevenlabs.synthesize(text)');
    expect(archDoc).toContain('macosSay.synthesize(text)');
  });

  it('documents macosSay.listVoices', async () => {
    archDoc = archDoc || await fs.readFile(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
    expect(archDoc).toContain('macosSay.listVoices()');
  });

  it('documents sensevoice.check and whisper.check', async () => {
    archDoc = archDoc || await fs.readFile(path.join(ROOT, 'ARCHITECTURE.md'), 'utf8');
    expect(archDoc).toContain('sensevoice.check()');
    expect(archDoc).toContain('whisper.check()');
  });
});

describe('Voice adapter source files match documented signatures', () => {
  const expectedTTS = ['kokoro.js', 'piper.js', 'openai-tts.js', 'elevenlabs.js', 'macos-say.js'];
  const expectedSTT = ['sensevoice.js', 'whisper.js', 'openai-whisper.js'];

  it('all documented TTS adapters exist and export synthesize', async () => {
    for (const file of expectedTTS) {
      const mod = await import(path.join(VOICE_DIR, file));
      expect(typeof mod.synthesize, `${file} should export synthesize`).toBe('function');
    }
  });

  it('all documented STT adapters exist and export transcribe', async () => {
    for (const file of expectedSTT) {
      const mod = await import(path.join(VOICE_DIR, file));
      expect(typeof mod.transcribe, `${file} should export transcribe`).toBe('function');
    }
  });

  it('sensevoice and whisper export check()', async () => {
    const sv = await import(path.join(VOICE_DIR, 'sensevoice.js'));
    const wh = await import(path.join(VOICE_DIR, 'whisper.js'));
    expect(typeof sv.check).toBe('function');
    expect(typeof wh.check).toBe('function');
  });

  it('macos-say exports listVoices()', async () => {
    const mod = await import(path.join(VOICE_DIR, 'macos-say.js'));
    expect(typeof mod.listVoices).toBe('function');
  });
});
