import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const archDoc = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf8');

describe('DBB-011: ARCHITECTURE.md — no stale CR content', () => {
  it('does not contain change-request references', () => {
    expect(archDoc.includes('change-request')).toBeFalsy();
  });

  it('does not contain CR- prefixed blocks', () => {
    expect(/\bCR-\d+/i.test(archDoc)).toBeFalsy();
  });

  it('does not contain cr- prefixed references', () => {
    expect(/\bcr-\d+/i.test(archDoc)).toBeFalsy();
  });
});

describe('DBB-012: ARCHITECTURE.md — directory tree accuracy', () => {
  it('mentions key source files', () => {
    const keyFiles = ['config.js', 'api.js', 'brain.js', 'hardware.js'];
    for (const f of keyFiles) {
      expect(archDoc.includes(f)).toBeTruthy();
    }
  });

  it('mentions matcher.js', () => {
    expect(archDoc.includes('matcher.js')).toBeTruthy();
  });

  it('mentions ollama.js', () => {
    expect(archDoc.includes('ollama.js')).toBeTruthy();
  });

  it('mentions profiles.js', () => {
    expect(archDoc.includes('profiles.js')).toBeTruthy();
  });

  it('port references show 1234 (not 3000 in deployment context)', () => {
    // Check that deployment/Docker port references use 1234
    if (archDoc.includes('1234')) {
      // If 1234 is mentioned, 3000 should not appear as the default port
      const portLines = archDoc.split('\n').filter(l => /port|端口/.test(l));
      for (const line of portLines) {
        if (line.includes('3000')) {
          // 3000 in a port context is stale
          expect.fail(`Stale port 3000 reference: "${line.trim()}"`);
        }
      }
    }
  });
});

describe('Test suite health — deleted test files removed', () => {
  const deletedTests = [
    'test/optimizer.test.js',
    'test/m62-optimizer.test.js',
    'test/m74-optimizer.test.js',
    'test/m21-optimizer.test.js',
    'test/detector/m71-optimizer-adaptive.test.js',
    'test/detector/optimizer-m76.test.js',
    'test/runtime/memory-mutex-m10.test.js',
    'test/m27-sense-memory.test.js',
    'test/runtime/m38-runtime.test.js',
    'test/runtime/cloud-fallback-m93.test.js',
  ];

  for (const f of deletedTests) {
    it(`${f} should be deleted (tests removed functionality)`, () => {
      expect(existsSync(resolve(ROOT, f))).toBeFalsy();
    });
  }
});
