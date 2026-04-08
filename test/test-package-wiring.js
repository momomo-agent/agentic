#!/usr/bin/env node
// Test: agentic-sense and agentic-voice package wiring via imports map
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8'));

let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

// imports map exists
test('package.json has imports map', () => assert.ok(pkg.imports));

// required keys
for (const key of ['agentic-sense', 'agentic-voice/sensevoice', 'agentic-voice/whisper',
  'agentic-voice/openai-whisper', 'agentic-voice/openai-tts', 'agentic-voice/kokoro', 'agentic-voice/piper']) {
  test(`imports map has ${key}`, () => assert.ok(pkg.imports[key], `${key} missing`));
}

// source files use correct import specifiers
test('sense.js imports from agentic-sense', () => {
  const src = readFileSync(resolve(__dirname, '../src/runtime/sense.js'), 'utf8');
  assert.ok(src.includes("from 'agentic-sense'"));
});
test('stt.js imports from agentic-voice/*', () => {
  const src = readFileSync(resolve(__dirname, '../src/runtime/stt.js'), 'utf8');
  assert.ok(src.includes("'agentic-voice/"));
});
test('tts.js imports from agentic-voice/*', () => {
  const src = readFileSync(resolve(__dirname, '../src/runtime/tts.js'), 'utf8');
  assert.ok(src.includes("'agentic-voice/"));
});

// adapter files exist at mapped paths
for (const [key, rel] of Object.entries(pkg.imports)) {
  test(`adapter file exists for ${key}`, () => {
    assert.ok(existsSync(resolve(__dirname, '..', rel)), `missing: ${rel}`);
  });
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
