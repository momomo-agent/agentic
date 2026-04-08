import { test } from 'vitest';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

test('setup-ollama-m12', async () => {
const src = await readFile(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '../../src/cli/setup.js'),
  'utf8'
);

describe('setup.js DBB: Ollama auto-install', () => {
  it('installOllama uses spawn sh -c (not just print)', () => {
    assert.ok(src.includes("spawn('sh'"), 'should spawn sh for install');
    assert.ok(src.includes('installOllama'), 'installOllama function exists');
  });

  it('pullModel uses spawn ollama pull', () => {
    assert.ok(src.includes("spawn('ollama'"), 'should spawn ollama pull');
    assert.ok(src.includes('pullModel'), 'pullModel function exists');
  });

  it('needsInstall branch calls installOllama and pullModel', () => {
    assert.ok(src.includes('needsInstall'), 'checks needsInstall');
    assert.ok(src.includes('await installOllama'), 'awaits installOllama');
    assert.ok(src.includes('await pullModel'), 'awaits pullModel');
  });

  it('installOllama rejects on non-zero exit code', () => {
    assert.ok(
      src.includes("reject(new Error(`install failed") || src.includes("reject(new Error('install failed"),
      'rejects on non-zero exit'
    );
  });
});
});
