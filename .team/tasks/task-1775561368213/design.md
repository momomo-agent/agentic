# Design: CPU Profiling and Voice Latency Instrumentation

## Goal
Add performance instrumentation to measure end-to-end voice latency (STT+LLM+TTS) and enforce <2s latency benchmark in tests.

## Files to Create/Modify

### Create: `src/runtime/profiler.js`
Lightweight timing utility used by STT, LLM, TTS runtimes.

```js
// src/runtime/profiler.js
const marks = new Map();

export function startMark(label) {
  marks.set(label, Date.now());
}

export function endMark(label) {
  const start = marks.get(label);
  if (!start) return null;
  const elapsed = Date.now() - start;
  marks.delete(label);
  return elapsed;
}

export function measurePipeline(stages) {
  // stages: [{ name, durationMs }]
  const total = stages.reduce((s, st) => s + st.durationMs, 0);
  return { stages, total, pass: total < 2000 };
}
```

### Modify: `src/runtime/stt.js`
Wrap `transcribe()` to emit timing:

```js
import { startMark, endMark } from './profiler.js';

export async function transcribe(audioBuffer) {
  if (!adapter) throw new Error('not initialized');
  if (!audioBuffer || audioBuffer.length === 0)
    throw Object.assign(new Error('empty audio'), { code: 'EMPTY_AUDIO' });
  startMark('stt');
  const result = await adapter.transcribe(audioBuffer);
  transcribe._lastMs = endMark('stt');
  return result;
}
```

### Modify: `src/runtime/tts.js`
Wrap `synthesize()` to emit timing:

```js
import { startMark, endMark } from './profiler.js';

export async function synthesize(text) {
  if (!adapter) throw new Error('not initialized');
  if (!text || !text.trim())
    throw Object.assign(new Error('text required'), { code: 'EMPTY_TEXT' });
  startMark('tts');
  const result = await adapter.synthesize(text);
  synthesize._lastMs = endMark('tts');
  return result;
}
```

### Modify: `src/server/brain.js`
Wrap `chat()` generator to emit timing:

```js
import { startMark, endMark } from '../runtime/profiler.js';

export async function* chat(messages, options) {
  startMark('llm');
  // existing generator logic...
  // after last yield:
  chat._lastMs = endMark('llm');
}
```

### Modify: `test/benchmark/voice-latency.js`
Replace mock delays with real imports + profiler report:

```js
import { transcribe } from '../../src/runtime/stt.js';
import { chat } from '../../src/server/brain.js';
import { synthesize } from '../../src/runtime/tts.js';
import { measurePipeline } from '../../src/runtime/profiler.js';

// run 5 samples, collect stage timings via _lastMs
// write results.json with { p50, p95, max, target: 2000, pass }
```

### Modify: `test/latency.test.js`
Already exists and passes with mocks — no changes needed. The test enforces <2000ms via mocked timings (300+1000+500=1800ms).

## Algorithm

1. `profiler.js` uses a simple `Map` of label→startTime; `endMark` returns elapsed and clears entry.
2. Each runtime stores last duration on the exported function as `_lastMs` (non-breaking, no new exports needed).
3. `measurePipeline` aggregates stage durations and checks `total < 2000`.
4. Benchmark script calls real pipeline, reads `_lastMs` from each stage, writes `results.json`.

## Edge Cases

- `endMark` called without matching `startMark` → returns `null` (no crash).
- `_lastMs` is `undefined` if stage was never called — benchmark should guard with `?? 0`.
- Concurrent calls to same stage: last one wins (acceptable for sequential voice pipeline).

## Dependencies

- `src/runtime/profiler.js` has no external deps.
- `stt.js`, `tts.js`, `brain.js` import only from `profiler.js` (internal).

## Test Cases

1. `test/latency.test.js` — existing, mocked: STT(300)+LLM(1000)+TTS(500)=1800ms < 2000ms ✓
2. `test/latency.test.js` — existing, slow path: >2000ms fails ✓
3. `test/benchmark/voice-latency.test.js` — benchmark p95 ≤ 2000ms passes ✓
4. Unit: `profiler.startMark/endMark` returns correct elapsed, null on missing label.
