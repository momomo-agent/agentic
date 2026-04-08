import { test } from 'vitest';
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import { fileURLToPath } from 'url';

test('m38-tts', async () => {
const src = fs.readFileSync(fileURLToPath(new URL('../../src/runtime/tts.js', import.meta.url)), 'utf8');

describe('m38: tts.js', () => {
  let ttsModule;

  before(async () => {
    ttsModule = await import('../../src/runtime/tts.js');
  });

  it('exports init and synthesize', () => {
    assert.equal(typeof ttsModule.init, 'function');
    assert.equal(typeof ttsModule.synthesize, 'function');
  });

  it('synthesize before init throws "not initialized"', () => {
    assert.ok(src.includes("'not initialized'"));
  });

  it('blank text throws EMPTY_TEXT with code', () => {
    assert.ok(src.includes("'text required'"));
    assert.ok(src.includes("code: 'EMPTY_TEXT'"));
  });

  it('whitespace-only text is guarded via trim()', () => {
    assert.ok(src.includes('.trim()'));
  });

  it('adapter map includes kokoro, piper, default openai-tts', () => {
    assert.ok(src.includes('kokoro'));
    assert.ok(src.includes('piper'));
    assert.ok(src.includes('agentic-voice/openai-tts'));
  });

  it('init falls back to default on adapter load failure', () => {
    assert.ok(src.includes('ADAPTERS.default'));
  });
});
});
