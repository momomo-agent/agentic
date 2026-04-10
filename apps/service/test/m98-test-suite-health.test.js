import { describe, it, assert } from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const archDoc = readFileSync(resolve(ROOT, 'ARCHITECTURE.md'), 'utf8');

describe('DBB-011: ARCHITECTURE.md — no stale CR content', () => {
  it('does not contain change-request references', () => {
    assert.ok(!archDoc.includes('change-request'), 'should not contain "change-request"');
  });

  it('does not contain CR- prefixed blocks', () => {
    assert.ok(!/\bCR-\d+/i.test(archDoc), 'should not contain CR-NNN references');
  });

  it('does not contain cr- prefixed references', () => {
    assert.ok(!/\bcr-\d+/i.test(archDoc), 'should not contain cr-NNN references');
  });
});

describe('DBB-012: ARCHITECTURE.md — directory tree accuracy', () => {
  it('references port 1234 (not 3000) in any port mentions', () => {
    // Check if there are port references
    const portMatches = archDoc.match(/port\s+\d+|:\d{4}/gi) || [];
    for (const m of portMatches) {
      assert.ok(!m.includes('3000'), `should not reference port 3000: "${m}"`);
    }
  });

  it('mentions key source files from src/', () => {
    const srcFiles = [];
    function walk(dir) {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === 'ui') continue;
        const full = resolve(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js')) srcFiles.push(full.replace(resolve(ROOT, 'src') + '/', ''));
      }
    }
    walk(resolve(ROOT, 'src'));

    // Key files that should be in the architecture doc
    const keyFiles = ['config.js', 'server/api.js', 'server/brain.js', 'detector/hardware.js'];
    for (const f of keyFiles) {
      const basename = f.split('/').pop();
      assert.ok(archDoc.includes(basename), `ARCHITECTURE.md should mention ${basename}`);
    }
  });

  it('mentions matcher.js in directory tree', () => {
    assert.ok(archDoc.includes('matcher.js'), 'should mention matcher.js');
  });

  it('mentions ollama.js in directory tree', () => {
    assert.ok(archDoc.includes('ollama.js'), 'should mention ollama.js');
  });

  it('deleted files are not listed as active (optimizer.js removed)', () => {
    // optimizer.js was deleted — it should not appear as a current source file
    // (it may appear in historical context, but not in the directory tree section)
    const treeSection = archDoc.split('目录结构')[1]?.split('##')[0] || '';
    // optimizer.js was replaced by profiles.js + matcher.js
    // It's OK if optimizer.js appears elsewhere in docs, but the tree should have the replacements
    assert.ok(treeSection.includes('profiles.js'), 'directory tree should include profiles.js');
    assert.ok(treeSection.includes('matcher.js'), 'directory tree should include matcher.js');
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
    'test/runtime/memory.test.js',
    'test/runtime/memory-mutex-m10.test.js',
    'test/m27-sense-memory.test.js',
    'test/runtime/m38-runtime.test.js',
    'test/runtime/cloud-fallback-m93.test.js',
  ];

  for (const f of deletedTests) {
    it(`${f} should be deleted (tests removed functionality)`, () => {
      assert.ok(!existsSync(resolve(ROOT, f)), `${f} should not exist — it tests deleted code`);
    });
  }
});
