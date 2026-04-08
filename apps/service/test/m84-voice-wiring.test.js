import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { existsSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const stt = readFileSync('src/runtime/stt.js', 'utf8');
const tts = readFileSync('src/runtime/tts.js', 'utf8');

describe('agentic-voice external package wiring (m84)', () => {
  it('package.json declares agentic-voice dependency', () => {
    expect(pkg.dependencies).toHaveProperty('agentic-voice');
  });

  it('stt.js uses agentic-voice/* imports only', () => {
    expect(stt).toMatch(/import\('agentic-voice\//);
    expect(stt).not.toMatch(/import\(['"]\.\.\/adapters\//);
  });

  it('stt.js has sensevoice, whisper, and default adapters from agentic-voice', () => {
    expect(stt).toContain("import('agentic-voice/sensevoice')");
    expect(stt).toContain("import('agentic-voice/whisper')");
    expect(stt).toContain("import('agentic-voice/openai-whisper')");
  });

  it('tts.js uses agentic-voice/* imports only', () => {
    expect(tts).toMatch(/import\('agentic-voice\//);
    expect(tts).not.toMatch(/import\(['"]\.\.\/adapters\//);
  });

  it('tts.js has kokoro, piper, and default adapters from agentic-voice', () => {
    expect(tts).toContain("import('agentic-voice/kokoro')");
    expect(tts).toContain("import('agentic-voice/piper')");
    expect(tts).toContain("import('agentic-voice/openai-tts')");
  });

  it('no local voice adapter stubs in src/runtime/adapters/', () => {
    const voiceStubs = ['stt.js', 'tts.js', 'sensevoice.js', 'whisper.js', 'kokoro.js', 'piper.js'];
    for (const stub of voiceStubs) {
      expect(existsSync(`src/runtime/adapters/${stub}`)).toBe(false);
    }
  });
});
