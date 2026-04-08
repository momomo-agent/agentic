import { test } from 'vitest';
// Tests for server-side VAD — task-1775526816885
import assert from 'assert';
import { detectVoiceActivity } from '../src/runtime/vad.js';

test('m62-server-vad', async () => {
let passed = 0, failed = 0;
const failures = [];

function test(name, fn) {
  try { fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.log(`  ✗ ${name}: ${e.message}`); failed++; failures.push(name); }
}

console.log('M62 server-side VAD tests\n');

// Helper: create Int16 PCM buffer
function pcmBuffer(samples) {
  const buf = Buffer.alloc(samples.length * 2);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(v * 32767), i * 2));
  return buf;
}

test('DBB-001: silent buffer (all zeros) returns false', () => {
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(1024).fill(0))), false);
});

test('DBB-001: speech buffer (loud samples) returns true', () => {
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(1024).fill(0.5))), true);
});

test('DBB-001: samples just above threshold return true', () => {
  // RMS of 0.02 > SILENCE_THRESHOLD 0.01
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(1024).fill(0.02))), true);
});

test('DBB-001: samples just below threshold return false', () => {
  // RMS of 0.005 < SILENCE_THRESHOLD 0.01
  assert.strictEqual(detectVoiceActivity(pcmBuffer(new Array(1024).fill(0.005))), false);
});

test('edge: empty buffer returns false', () => {
  assert.strictEqual(detectVoiceActivity(Buffer.alloc(0)), false);
});

test('edge: null buffer returns false', () => {
  assert.strictEqual(detectVoiceActivity(null), false);
});

test('edge: 1-byte buffer (< 2 bytes) returns false', () => {
  assert.strictEqual(detectVoiceActivity(Buffer.alloc(1)), false);
});

test('edge: mixed silence and speech — RMS above threshold returns true', () => {
  const samples = new Array(1024).fill(0);
  // Set first 100 samples to loud
  for (let i = 0; i < 100; i++) samples[i] = 0.5;
  assert.strictEqual(detectVoiceActivity(pcmBuffer(samples)), true);
});

console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
if (failures.length) { console.log('Failures:', failures); process.exit(1); }
});
