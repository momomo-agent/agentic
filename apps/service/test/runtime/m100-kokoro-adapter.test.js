/**
 * M100 — Kokoro adapter tests
 * Verifies DBB-001 through DBB-007 for the missing kokoro.js adapter fix.
 */
import { test, expect, describe } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, '../../src');
const ADAPTERS_DIR = path.join(SRC_ROOT, 'runtime', 'adapters', 'voice');

describe('M100: kokoro adapter exists and is valid', () => {
  const kokoroPath = path.join(ADAPTERS_DIR, 'kokoro.js');

  test('DBB-001/002: kokoro.js file exists on disk', () => {
    expect(fs.existsSync(kokoroPath)).toBe(true);
  });

  test('DBB-001: kokoro adapter is importable without error', async () => {
    const mod = await import('../../src/runtime/adapters/voice/kokoro.js');
    expect(mod).toBeDefined();
  });

  test('DBB-001: kokoro adapter exports synthesize as a function', async () => {
    const mod = await import('../../src/runtime/adapters/voice/kokoro.js');
    expect(typeof mod.synthesize).toBe('function');
  });
});

describe('M100: all ADAPTERS map entries have files on disk', () => {
  // Read tts.js source and extract adapter file references
  const ttsSrc = fs.readFileSync(path.join(SRC_ROOT, 'runtime', 'tts.js'), 'utf8');

  // Extract all import paths from the ADAPTERS map
  const importPaths = [...ttsSrc.matchAll(/import\(['"](.\/adapters\/voice\/[^'"]+)['"]\)/g)]
    .map(m => m[1]);

  test('DBB-002: found adapter import paths in tts.js', () => {
    expect(importPaths.length).toBeGreaterThan(0);
  });

  // Deduplicate (openai-tts appears twice: for 'openai' and 'default')
  const uniquePaths = [...new Set(importPaths)];

  for (const rel of uniquePaths) {
    const adapterName = path.basename(rel, '.js');
    test(`DBB-002: adapter file exists for ${adapterName}`, () => {
      const fullPath = path.resolve(SRC_ROOT, 'runtime', rel);
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    test(`DBB-002: adapter ${adapterName} is importable`, async () => {
      const mod = await import(`../../src/runtime/${rel}`);
      expect(mod).toBeDefined();
      // Every voice adapter must export synthesize
      expect(typeof mod.synthesize).toBe('function');
    });
  }
});

describe('M100: dead code cleanup', () => {
  test('DBB-006: src/runtime/adapters/embed.js does not exist', () => {
    const embedPath = path.join(SRC_ROOT, 'runtime', 'adapters', 'embed.js');
    expect(fs.existsSync(embedPath)).toBe(false);
  });

  test('DBB-006: no source references to adapters/embed', () => {
    // Recursively check src/ for references
    function findRefs(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(dir, e.name);
        if (e.isDirectory() && e.name !== 'node_modules') {
          findRefs(full);
        } else if (e.isFile() && e.name.endsWith('.js')) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('adapters/embed')) {
            throw new Error(`Found reference to adapters/embed in ${full}`);
          }
        }
      }
    }
    expect(() => findRefs(SRC_ROOT)).not.toThrow();
  });

  test('DBB-007: vitest.config.js has no #agentic-embed alias', () => {
    const vitestConfig = fs.readFileSync(
      path.resolve(__dirname, '../../vitest.config.js'), 'utf8'
    );
    expect(vitestConfig).not.toContain('#agentic-embed');
  });
});

describe('M100: kokoro adapter contract correctness', () => {
  test('kokoro adapter uses correct default base URL (localhost:8880)', async () => {
    const src = fs.readFileSync(path.join(ADAPTERS_DIR, 'kokoro.js'), 'utf8');
    expect(src).toContain('localhost:8880');
  });

  test('kokoro adapter uses /v1/audio/speech endpoint', async () => {
    const src = fs.readFileSync(path.join(ADAPTERS_DIR, 'kokoro.js'), 'utf8');
    expect(src).toContain('/v1/audio/speech');
  });

  test('kokoro adapter reads config from ~/.agentic-service/config.json', async () => {
    const src = fs.readFileSync(path.join(ADAPTERS_DIR, 'kokoro.js'), 'utf8');
    expect(src).toContain('.agentic-service');
    expect(src).toContain('config.json');
  });

  test('kokoro adapter throws descriptive error on HTTP failure', async () => {
    const src = fs.readFileSync(path.join(ADAPTERS_DIR, 'kokoro.js'), 'utf8');
    expect(src).toContain('Kokoro TTS failed');
    // Should attach status code
    expect(src).toContain('code: res.status');
  });
});
