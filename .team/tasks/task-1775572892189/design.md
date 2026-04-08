# Design: CPU Profiling Instrumentation

## Context
`src/runtime/profiler.js` already exists with `startMark`/`endMark`/`measurePipeline`.
`src/runtime/stt.js` and `src/runtime/tts.js` already import and call `startMark`/`endMark`.
`src/runtime/llm.js` uses `latency-log.js` but not profiler yet.

## What's Needed
1. Add `getMetrics()` to `src/runtime/profiler.js` — returns per-stage stats for `/api/perf`
2. Wire `startMark`/`endMark` into `src/runtime/llm.js` (already done in stt/tts)

## Files
- **modify** `src/runtime/profiler.js` — add `getMetrics()` and internal metrics accumulation
- **modify** `src/runtime/llm.js` — add profiler timing around chat()

## profiler.js Changes

Add internal accumulator and `getMetrics()`:

```js
// add after existing marks Map:
const metrics = new Map(); // stage -> { sum, count, last }

// update endMark to accumulate:
export function endMark(label) {
  const start = marks.get(label);
  if (!start) return null;
  const elapsed = Date.now() - start;
  marks.delete(label);
  const m = metrics.get(label) ?? { sum: 0, count: 0, last: 0 };
  metrics.set(label, { sum: m.sum + elapsed, count: m.count + 1, last: elapsed });
  return elapsed;
}

export function getMetrics() {
  const out = {};
  for (const [stage, { sum, count, last }] of metrics) {
    out[stage] = { last, avg: count ? Math.round(sum / count) : 0, count };
  }
  return out;
}
```

## llm.js Change

Add around the core chat call:
```js
import { startMark, endMark } from './profiler.js';
// in chat():
startMark('llm');
try { return await _chatImpl(...) } finally { endMark('llm'); }
```

## Edge Cases
- `endMark` already uses `finally` pattern in callers — accumulation is safe on error
- `getMetrics()` returns `{}` before any calls
- `measurePipeline` is unchanged (takes explicit stage objects, not internal metrics)
