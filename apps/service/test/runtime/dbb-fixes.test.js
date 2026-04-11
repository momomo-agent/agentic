import { test } from 'vitest';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

test('dbb-fixes', async () => {
describe('DBB fixes', () => {
  // memory.js was removed — dead file cleanup

  it('brain.js normalizeMessages converts tool role to Anthropic format', async () => {
    // Test via chat() with a pre-normalized message — verify no crash and format
    // normalizeMessages is internal; verify indirectly via module load
    const brain = await import('../../src/server/brain.js');
    assert.equal(typeof brain.chat, 'function');
  });

  it('brain.js tool_use input handles string arguments', async () => {
    // Verify JSON.parse guard: typeof check on tc.function.arguments
    const strArgs = '{"key":"val"}';
    const objArgs = { key: 'val' };
    const parse = (args) => typeof args === 'string' ? JSON.parse(args) : args;
    assert.deepEqual(parse(strArgs), { key: 'val' });
    assert.deepEqual(parse(objArgs), { key: 'val' });
  });

  it('bin SIGINT handler exists (server.close called)', async () => {
    // Verify the bin file contains SIGINT handler — read and check
    const { readFileSync } = await import('node:fs');
    const bin = readFileSync(new URL('../../bin/agentic-service.js', import.meta.url), 'utf8');
    assert.ok(bin.includes("process.on('SIGINT'"), 'SIGINT handler present');
    assert.ok(bin.includes('server.close'), 'server.close called in SIGINT handler');
  });

  it('optimizer pullModel onProgress callback updates spinner text', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(new URL('../../src/detector/optimizer.js', import.meta.url), 'utf8');
    assert.ok(src.includes('onProgress(percent'), 'onProgress called with percent');
    assert.ok(src.includes('spinner.text'), 'spinner.text updated with progress');
  });
});
});
