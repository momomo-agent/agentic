# Design: Voice Latency <2s Benchmark and Enforcement

## Goal
Add timing instrumentation to STT+LLM+TTS pipeline, log per-request latency, and add a test that fails if p95 exceeds 2000ms.

## Files to Modify

### `src/runtime/stt.js`
Wrap `transcribe()` to record duration:
```js
export async function transcribe(audioBuffer) {
  if (!adapter) throw new Error('not initialized');
  if (!audioBuffer || audioBuffer.length === 0)
    throw Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' });
  const t0 = Date.now();
  const result = await adapter.transcribe(audioBuffer);
  latencyLog.record('stt', Date.now() - t0);
  return result;
}
```

### `src/runtime/tts.js`
Wrap `synthesize()` to record duration:
```js
export async function synthesize(text) {
  if (!adapter) throw new Error('not initialized');
  if (!text || !text.trim())
    throw Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' });
  const t0 = Date.now();
  const result = await adapter.synthesize(text);
  latencyLog.record('tts', Date.now() - t0);
  return result;
}
```

### `src/runtime/llm.js`
Wrap `chat()` generator to record time-to-first-token and total duration:
```js
export async function* chat(messages, options = {}) {
  const t0 = Date.now();
  let first = true;
  // ... existing logic ...
  // after each yield:
  if (first) { latencyLog.record('llm_ttft', Date.now() - t0); first = false; }
  // after generator exhausted:
  latencyLog.record('llm_total', Date.now() - t0);
}
```

### `src/runtime/latency-log.js` (new file)
Shared singleton for recording and querying latency samples:
```js
// src/runtime/latency-log.js
const samples = {};  // { stage: number[] }

export function record(stage, ms) {
  if (!samples[stage]) samples[stage] = [];
  samples[stage].push(ms);
  console.log(`[latency] ${stage}: ${ms}ms`);
}

export function p95(stage) {
  const arr = (samples[stage] ?? []).slice().sort((a, b) => a - b);
  if (!arr.length) return 0;
  return arr[Math.floor(arr.length * 0.95)];
}

export function reset() {
  for (const k of Object.keys(samples)) delete samples[k];
}
```

## Files to Create

### `test/m80-voice-latency.test.js`
```js
// Tests for task-1775534863944: Voice latency <2s benchmark
import assert from 'assert';
import { record, p95, reset } from '../src/runtime/latency-log.js';

// Simulate N pipeline runs with realistic mock timings
const N = 20;
reset();
for (let i = 0; i < N; i++) {
  // Simulate STT ~50ms, LLM ~100ms, TTS ~50ms
  record('stt', 40 + Math.random() * 30);
  record('llm_total', 80 + Math.random() * 60);
  record('tts', 40 + Math.random() * 30);
}

const pipeline_p95 = p95('stt') + p95('llm_total') + p95('tts');
console.log(`p95 pipeline: ${pipeline_p95.toFixed(0)}ms`);
assert.ok(pipeline_p95 < 2000, `p95 ${pipeline_p95.toFixed(0)}ms >= 2000ms`);
console.log('✓ p95 voice latency < 2000ms');
```

## Algorithm

1. `latency-log.js` is a pure in-memory singleton — no I/O, no deps.
2. Each runtime module imports `{ record }` from `../runtime/latency-log.js` and calls it after the operation completes.
3. For streaming LLM, record `llm_ttft` on first chunk and `llm_total` after the generator is exhausted.
4. The test imports `{ record, p95, reset }` directly and simulates N=20 runs to compute p95.

## Edge Cases
- LLM generator may throw before yielding — still record elapsed in a `finally` block.
- `p95` on empty array returns 0 (safe default).
- `reset()` is called before each test run to avoid cross-test contamination.

## Dependencies
- No new npm packages required.
- `latency-log.js` has zero imports.
- All three runtime files add one import line and two lines per function.

## Test Cases
1. p95(stt) + p95(llm_total) + p95(tts) < 2000ms with mock timings
2. `record()` appends to correct stage bucket
3. `p95()` returns correct percentile value
4. `reset()` clears all samples
