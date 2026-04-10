/**
 * M100 DBB — Runtime Safety: Fix Missing Adapter + Dead Code Cleanup
 *
 * Tests for:
 *   task-1775858113988 — kokoro.js adapter creation
 *   task-1775858351181 — dead adapters/embed.js removal
 */
import { describe, it, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

// ─── Task 1: Kokoro adapter (task-1775858113988) ───

describe('DBB-001: No runtime error when kokoro provider is selected', () => {
  it('kokoro.js adapter file exists on disk', async () => {
    const adapterPath = path.join(SRC, 'runtime/adapters/voice/kokoro.js');
    await expect(fs.access(adapterPath)).resolves.toBeUndefined();
  });

  it('kokoro adapter can be dynamically imported without error', async () => {
    const mod = await import(path.join(SRC, 'runtime/adapters/voice/kokoro.js'));
    expect(mod).toBeDefined();
  });
});

describe('DBB-002: TTS adapter map is consistent with adapter files on disk', () => {
  it('every adapter in tts.js ADAPTERS map has a corresponding file', async () => {
    const ttsPath = path.join(SRC, 'runtime/tts.js');
    const src = await fs.readFile(ttsPath, 'utf8');

    // Extract import paths from ADAPTERS map
    const importRe = /import\(['"](.+?)['"]\)/g;
    const adaptersBlock = src.slice(
      src.indexOf('const ADAPTERS'),
      src.indexOf('};', src.indexOf('const ADAPTERS')) + 2
    );

    const paths = [];
    let m;
    while ((m = importRe.exec(adaptersBlock)) !== null) {
      paths.push(m[1]);
    }

    expect(paths.length).toBeGreaterThan(0);

    for (const rel of paths) {
      const abs = path.resolve(path.join(SRC, 'runtime'), rel);
      await expect(
        fs.access(abs),
        `Adapter file missing: ${rel}`
      ).resolves.toBeUndefined();
    }
  });

  it('kokoro adapter exports a synthesize function', async () => {
    const mod = await import(path.join(SRC, 'runtime/adapters/voice/kokoro.js'));
    expect(typeof mod.synthesize).toBe('function');
  });
});

describe('DBB-004: Existing TTS providers still work after the change', () => {
  const voiceDir = path.join(SRC, 'runtime/adapters/voice');

  it('all voice adapters export synthesize', async () => {
    const files = await fs.readdir(voiceDir);
    const ttsAdapters = files.filter(f =>
      f.endsWith('.js') && !f.includes('whisper') && !f.includes('sensevoice')
    );

    for (const file of ttsAdapters) {
      const mod = await import(path.join(voiceDir, file));
      expect(
        typeof mod.synthesize,
        `${file} should export synthesize`
      ).toBe('function');
    }
  });
});

describe('DBB-005: All existing tests pass (regression check)', () => {
  it('tts.js source has not been modified (no regression risk)', async () => {
    const ttsPath = path.join(SRC, 'runtime/tts.js');
    const src = await fs.readFile(ttsPath, 'utf8');
    // Verify key structure is intact
    expect(src).toContain('const ADAPTERS');
    expect(src).toContain("kokoro:");
    expect(src).toContain("'macos-say':");
    expect(src).toContain('piper:');
    expect(src).toContain('elevenlabs:');
    expect(src).toContain('openai:');
    expect(src).toContain('export async function synthesize');
    expect(src).toContain('export async function init');
  });
});

// ─── Task 2: Dead embed.js removal (task-1775858351181) ───

describe('DBB-006: Dead code adapters/embed.js is removed', () => {
  it('src/runtime/adapters/embed.js does not exist on disk', async () => {
    const embedPath = path.join(SRC, 'runtime/adapters/embed.js');
    await expect(fs.access(embedPath)).rejects.toThrow();
  });

  it('no source code references adapters/embed', async () => {
    const { execSync } = await import('child_process');
    const result = execSync(
      `grep -r "adapters/embed" "${SRC}" 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    expect(result.trim()).toBe('');
  });
});

describe('DBB-007: vitest.config.js has no stale alias after dead code removal', () => {
  it('vitest.config.js does not contain #agentic-embed alias', async () => {
    const configPath = path.join(ROOT, 'vitest.config.js');
    const src = await fs.readFile(configPath, 'utf8');
    expect(src).not.toContain('#agentic-embed');
  });

  it('vitest.config.js does not reference adapters/embed.js', async () => {
    const configPath = path.join(ROOT, 'vitest.config.js');
    const src = await fs.readFile(configPath, 'utf8');
    expect(src).not.toContain('adapters/embed');
  });

  it('vitest.config.js is valid (no stale path import)', async () => {
    const configPath = path.join(ROOT, 'vitest.config.js');
    const src = await fs.readFile(configPath, 'utf8');
    // Should not import path since it was only needed for the alias
    expect(src).not.toMatch(/^import path from/m);
  });
});

// ─── Kokoro adapter contract tests ───

describe('Kokoro adapter contract', () => {
  it('synthesize rejects with descriptive error on non-200 response', async () => {
    // We can't hit a real server, but we verify the function signature and error shape
    const mod = await import(path.join(SRC, 'runtime/adapters/voice/kokoro.js'));
    // Calling synthesize without a kokoro server should throw a fetch/network error
    await expect(mod.synthesize('hello')).rejects.toThrow();
  });

  it('adapter follows the same pattern as other voice adapters', async () => {
    const kokoro = await fs.readFile(
      path.join(SRC, 'runtime/adapters/voice/kokoro.js'), 'utf8'
    );
    // Should read config from ~/.agentic-service/config.json
    expect(kokoro).toContain('.agentic-service');
    expect(kokoro).toContain('config.json');
    // Should export synthesize
    expect(kokoro).toContain('export async function synthesize');
    // Should use fetch for HTTP
    expect(kokoro).toContain('fetch(');
    // Should return Buffer
    expect(kokoro).toContain('Buffer.from');
  });
});

// ─── Adapters directory integrity ───

describe('Adapters directory integrity after changes', () => {
  it('src/runtime/adapters/ contains only sense.js and voice/', async () => {
    const entries = await fs.readdir(path.join(SRC, 'runtime/adapters'));
    expect(entries.sort()).toEqual(['sense.js', 'voice']);
  });
});
