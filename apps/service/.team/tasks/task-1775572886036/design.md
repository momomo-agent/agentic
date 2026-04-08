# Design: Voice Latency Benchmark Test

## Context
- `test/benchmark/voice-latency.test.js` already exists (reads results.json, checks api.js source)
- `src/runtime/profiler.js` has `measurePipeline(stages)` — takes `[{name, durationMs}]`, returns `{stages, total, pass}`
- Project uses vitest (not jest)

## File
- **create** `test/m88-voice-latency-benchmark.test.js`

## Implementation
```js
import { test } from 'vitest';
import { strict as assert } from 'assert';
import { measurePipeline } from '../src/runtime/profiler.js';

test('m88: STT+LLM+TTS pipeline < 2000ms', () => {
  const result = measurePipeline([
    { name: 'stt', durationMs: 80 },
    { name: 'llm', durationMs: 300 },
    { name: 'tts', durationMs: 80 },
  ]);
  assert.ok(result.pass, `total ${result.total}ms >= 2000ms`);
  assert.ok(result.total < 2000);
});

test('m88: measurePipeline fails when total >= 2000ms', () => {
  const result = measurePipeline([
    { name: 'stt', durationMs: 1000 },
    { name: 'llm', durationMs: 1000 },
    { name: 'tts', durationMs: 100 },
  ]);
  assert.strictEqual(result.pass, false);
});
```

## Dependencies
- `src/runtime/profiler.js` — `measurePipeline` already exists, no changes needed
