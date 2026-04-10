/**
 * M100 — Edge case tests for kokoro adapter + dead code cleanup
 * Supplements m100-kokoro-adapter.test.js with additional verification.
 */
import { test, expect, describe } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_ROOT = path.resolve(__dirname, '../../src');

describe('M100 edge cases: no collateral damage', () => {
  test('adapters/ directory still contains sense.js', () => {
    expect(fs.existsSync(path.join(SRC_ROOT, 'runtime', 'adapters', 'sense.js'))).toBe(true);
  });

  test('adapters/voice/ directory still contains all expected adapters', () => {
    const voiceDir = path.join(SRC_ROOT, 'runtime', 'adapters', 'voice');
    const files = fs.readdirSync(voiceDir).sort();
    expect(files).toContain('kokoro.js');
    expect(files).toContain('piper.js');
    expect(files).toContain('macos-say.js');
    expect(files).toContain('elevenlabs.js');
    expect(files).toContain('openai-tts.js');
  });

  test('vitest.config.js has no stale path import', () => {
    const config = fs.readFileSync(
      path.resolve(__dirname, '../../vitest.config.js'), 'utf8'
    );
    // path import was only needed for the alias — should be removed
    expect(config).not.toMatch(/import path from/);
  });

  test('vitest.config.js still has coverage thresholds', () => {
    const config = fs.readFileSync(
      path.resolve(__dirname, '../../vitest.config.js'), 'utf8'
    );
    expect(config).toContain('thresholds');
    expect(config).toContain('lines: 98');
  });

  test('src/runtime/embed.js (real module) is untouched', () => {
    const embedPath = path.join(SRC_ROOT, 'runtime', 'embed.js');
    expect(fs.existsSync(embedPath)).toBe(true);
    const src = fs.readFileSync(embedPath, 'utf8');
    expect(src).toContain('agentic-embed');
  });
});

describe('M100 edge cases: kokoro adapter robustness', () => {
  test('kokoro adapter handles missing config gracefully (empty catch)', async () => {
    const src = fs.readFileSync(
      path.join(SRC_ROOT, 'runtime', 'adapters', 'voice', 'kokoro.js'), 'utf8'
    );
    // Should have a try/catch around config reading
    expect(src).toMatch(/try\s*\{[\s\S]*readFile[\s\S]*\}\s*catch/);
  });

  test('kokoro adapter sends JSON content type', () => {
    const src = fs.readFileSync(
      path.join(SRC_ROOT, 'runtime', 'adapters', 'voice', 'kokoro.js'), 'utf8'
    );
    expect(src).toContain("'Content-Type': 'application/json'");
  });

  test('kokoro adapter returns Buffer from arrayBuffer', () => {
    const src = fs.readFileSync(
      path.join(SRC_ROOT, 'runtime', 'adapters', 'voice', 'kokoro.js'), 'utf8'
    );
    expect(src).toContain('Buffer.from');
    expect(src).toContain('arrayBuffer');
  });
});
