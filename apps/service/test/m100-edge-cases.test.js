/**
 * M100 Edge Case Tests — Additional coverage for kokoro adapter + embed removal
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// ─── Kokoro adapter edge cases ───

describe('Kokoro adapter: synthesize argument handling', () => {
  let synthesize;

  it('loads the kokoro module', async () => {
    const mod = await import(path.join(SRC, 'runtime/adapters/voice/kokoro.js'));
    synthesize = mod.synthesize;
    expect(typeof synthesize).toBe('function');
  });

  it('rejects when called with empty string (network error expected)', async () => {
    // No kokoro server running — should throw a network/fetch error, not silently succeed
    await expect(synthesize('')).rejects.toThrow();
  });

  it('rejects when called with no arguments (network error expected)', async () => {
    await expect(synthesize()).rejects.toThrow();
  });
});

describe('Kokoro adapter: default configuration', () => {
  it('uses localhost:8880 as default base URL', async () => {
    const src = await fs.readFile(
      path.join(SRC, 'runtime/adapters/voice/kokoro.js'), 'utf8'
    );
    expect(src).toContain('localhost:8880');
  });

  it('uses /v1/audio/speech endpoint (OpenAI-compatible)', async () => {
    const src = await fs.readFile(
      path.join(SRC, 'runtime/adapters/voice/kokoro.js'), 'utf8'
    );
    expect(src).toContain('/v1/audio/speech');
  });

  it('sends JSON content type', async () => {
    const src = await fs.readFile(
      path.join(SRC, 'runtime/adapters/voice/kokoro.js'), 'utf8'
    );
    expect(src).toContain('application/json');
  });
});

// ─── TTS adapter map completeness ───

describe('TTS adapter map: all voice adapter files are referenced', () => {
  it('every voice adapter file (excluding STT) is in the ADAPTERS map', async () => {
    const voiceDir = path.join(SRC, 'runtime/adapters/voice');
    const files = await fs.readdir(voiceDir);
    const ttsFiles = files.filter(f =>
      f.endsWith('.js') && !f.includes('whisper') && !f.includes('sensevoice')
    );

    const ttsSource = await fs.readFile(path.join(SRC, 'runtime/tts.js'), 'utf8');

    for (const file of ttsFiles) {
      expect(
        ttsSource.includes(file),
        `${file} should be referenced in tts.js ADAPTERS map`
      ).toBe(true);
    }
  });
});

// ─── STT adapters unaffected ───

describe('STT adapters unaffected by changes', () => {
  it('sensevoice.js exports transcribe', async () => {
    const mod = await import(path.join(SRC, 'runtime/adapters/voice/sensevoice.js'));
    expect(typeof mod.transcribe).toBe('function');
  });

  it('whisper.js exports transcribe', async () => {
    const mod = await import(path.join(SRC, 'runtime/adapters/voice/whisper.js'));
    expect(typeof mod.transcribe).toBe('function');
  });

  it('openai-whisper.js exports transcribe', async () => {
    const mod = await import(path.join(SRC, 'runtime/adapters/voice/openai-whisper.js'));
    expect(typeof mod.transcribe).toBe('function');
  });
});

// ─── Embed removal: real embed module unaffected ───

describe('Real embed module (src/runtime/embed.js) unaffected', () => {
  it('src/runtime/embed.js still exists', async () => {
    await expect(
      fs.access(path.join(SRC, 'runtime/embed.js'))
    ).resolves.toBeUndefined();
  });

  it('src/runtime/embed.js exports embed function', async () => {
    const mod = await import(path.join(SRC, 'runtime/embed.js'));
    expect(typeof mod.embed).toBe('function');
  });

  // memory.js was removed — dead file cleanup
});

// ─── vitest.config.js validity ───

describe('vitest.config.js structural integrity', () => {
  it('still has coverage thresholds configured', async () => {
    const src = await fs.readFile(path.join(ROOT, 'vitest.config.js'), 'utf8');
    expect(src).toContain('thresholds');
    expect(src).toContain('lines: 98');
    expect(src).toContain('functions: 98');
  });

  it('has no orphaned resolve block', async () => {
    const src = await fs.readFile(path.join(ROOT, 'vitest.config.js'), 'utf8');
    expect(src).not.toContain('resolve');
    expect(src).not.toContain('alias');
  });
});
