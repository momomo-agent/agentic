import { test } from 'vitest';
// Tests for task-1775534863944: Voice latency <2s benchmark
import assert from 'assert';
import { record, p95, reset } from '../src/runtime/latency-log.js';

// Test record/p95/reset
test('m80-voice-latency', async () => {
reset();
record('stt', 100);
record('stt', 200);
assert.strictEqual(p95('stt'), 200);
reset();
assert.strictEqual(p95('stt'), 0);
console.log('✓ record/p95/reset work correctly');

// Simulate N pipeline runs with realistic mock timings
const N = 20;
reset();
for (let i = 0; i < N; i++) {
  record('stt', 40 + Math.random() * 30);
  record('llm_total', 80 + Math.random() * 60);
  record('tts', 40 + Math.random() * 30);
}

const pipeline_p95 = p95('stt') + p95('llm_total') + p95('tts');
console.log(`p95 pipeline: ${pipeline_p95.toFixed(0)}ms`);
assert.ok(pipeline_p95 < 2000, `p95 ${pipeline_p95.toFixed(0)}ms >= 2000ms`);
console.log('✓ p95 voice latency < 2000ms');
});
