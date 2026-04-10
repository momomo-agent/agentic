/**
 * M100 — Voice Adapter API Signatures
 *
 * Verifies that ARCHITECTURE.md §11 voice adapter signatures
 * match the actual exported functions in src/runtime/adapters/voice/.
 *
 * Task: task-1775858361684
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const VOICE_DIR = path.join(ROOT, 'src/runtime/adapters/voice');
const ARCH_PATH = path.join(ROOT, 'ARCHITECTURE.md');

// Expected signatures from ARCHITECTURE.md §11
const STT_ADAPTERS = [
  { file: 'sensevoice.js', exports: ['check', 'transcribe'] },
  { file: 'whisper.js', exports: ['check', 'transcribe'] },
  { file: 'openai-whisper.js', exports: ['transcribe'] },
];

const TTS_ADAPTERS = [
  { file: 'kokoro.js', exports: ['synthesize'] },
  { file: 'piper.js', exports: ['synthesize'] },
  { file: 'openai-tts.js', exports: ['synthesize'] },
  { file: 'elevenlabs.js', exports: ['synthesize'] },
  { file: 'macos-say.js', exports: ['synthesize', 'listVoices'] },
];

const ALL_ADAPTERS = [...STT_ADAPTERS, ...TTS_ADAPTERS];

describe('ARCHITECTURE.md §11 voice adapter signatures', () => {
  it('every documented adapter file exists on disk', async () => {
    for (const { file } of ALL_ADAPTERS) {
      await expect(fs.access(path.join(VOICE_DIR, file))).resolves.toBeUndefined();
    }
  });

  it('no undocumented adapter files in voice/', async () => {
    const files = (await fs.readdir(VOICE_DIR)).filter(f => f.endsWith('.js'));
    const documented = ALL_ADAPTERS.map(a => a.file);
    for (const f of files) {
      expect(documented).toContain(f);
    }
  });

  for (const { file, exports: expectedExports } of ALL_ADAPTERS) {
    describe(file, () => {
      it('can be dynamically imported', async () => {
        const mod = await import(path.join(VOICE_DIR, file));
        expect(mod).toBeDefined();
      });

      for (const fn of expectedExports) {
        it(`exports ${fn} as a function`, async () => {
          const mod = await import(path.join(VOICE_DIR, file));
          expect(typeof mod[fn]).toBe('function');
        });
      }
    });
  }
});

describe('ARCHITECTURE.md documents all voice adapters', () => {
  it('§11 contains signature lines for every STT adapter', async () => {
    const arch = await fs.readFile(ARCH_PATH, 'utf8');
    expect(arch).toContain('sensevoice.check()');
    expect(arch).toContain('sensevoice.transcribe(buffer)');
    expect(arch).toContain('whisper.check()');
    expect(arch).toContain('whisper.transcribe(buffer)');
    expect(arch).toContain('openaiWhisper.transcribe(buffer)');
  });

  it('§11 contains signature lines for every TTS adapter', async () => {
    const arch = await fs.readFile(ARCH_PATH, 'utf8');
    expect(arch).toContain('kokoro.synthesize(text)');
    expect(arch).toContain('piper.synthesize(text)');
    expect(arch).toContain('openaiTts.synthesize(text)');
    expect(arch).toContain('elevenlabs.synthesize(text)');
    expect(arch).toContain('macosSay.synthesize(text)');
    expect(arch).toContain('macosSay.listVoices()');
  });
});
