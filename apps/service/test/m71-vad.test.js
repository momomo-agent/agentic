import { test } from 'vitest';
// Tests for task-1775528326243: Server-side VAD silence suppression
import assert from 'assert';
import { detectVoiceActivity } from '../src/runtime/vad.js';

test('m71-vad', async () => {
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push(name); }
}

function pcmBuffer(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(v * 32767), i * 2));
  return buf;
}

console.log('M71 VAD silence suppression tests\n');

// DBB: detectVoiceActivity uses RMS energy threshold 0.01
test('DBB: silent buffer (all zeros) → false', () => {
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(512).fill(0))), false);
});

test('DBB: non-silent buffer → true', () => {
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(512).fill(0.5))), true);
});

test('DBB: RMS below threshold (0.005) → false', () => {
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(512).fill(0.005))), false);
});

test('DBB: RMS just above threshold (0.011) → true', () => {
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(512).fill(0.011))), true);
});

test('edge: null → false', () => {
  assert.strictEqual(detectVoiceActivity(null), false);
});

test('edge: 1-byte buffer → false', () => {
  assert.strictEqual(detectVoiceActivity(Buffer.alloc(1)), false);
});

test('edge: 2-byte buffer with silence → false', () => {
  assert.strictEqual(detectVoiceActivity(Buffer.alloc(2)), false);
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('Failures:', failures); process.exit(1); }
});
