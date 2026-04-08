import { test } from 'vitest';
// Tests for cpu-only profile in profiles/default.json — task-1775526662402
import assert from 'assert';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

test('m61-cpu-only-profile', async () => {
const __dir = dirname(fileURLToPath(import.meta.url));
const profiles = JSON.parse(readFileSync(join(__dir, '../profiles/default.json'), 'utf8'));

let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push(name); }
}

console.log('M61 cpu-only profile tests\n');

const cpuEntry = profiles.profiles.find(p => p.match.gpu === 'none');

test('DBB-001: cpu-only entry exists with gpu=none match', () => {
  assert.ok(cpuEntry, 'No profile entry with match.gpu === "none"');
});

test('DBB-002: cpu-only has llm.provider', () => {
  assert.ok(cpuEntry?.config?.llm?.provider, 'llm.provider missing');
});

test('DBB-002: cpu-only has stt.provider', () => {
  assert.ok(cpuEntry?.config?.stt?.provider, 'stt.provider missing');
});

test('DBB-002: cpu-only has tts.provider', () => {
  assert.ok(cpuEntry?.config?.tts?.provider, 'tts.provider missing');
});

test('cpu-only uses gemma2:2b model', () => {
  assert.strictEqual(cpuEntry?.config?.llm?.model, 'gemma2:2b');
});

test('cpu-only placed before catch-all (empty match)', () => {
  const cpuIdx = profiles.profiles.findIndex(p => p.match.gpu === 'none');
  const catchAllIdx = profiles.profiles.findIndex(p => Object.keys(p.match).length === 0);
  assert.ok(cpuIdx < catchAllIdx, 'cpu-only must come before catch-all entry');
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('Failures:', failures); process.exit(1); }
});
