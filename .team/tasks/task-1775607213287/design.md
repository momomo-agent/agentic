# Task: Implement CPU profiling instrumentation for voice latency measurement

## Context

The Vision gap flags "CPU profiling / performance instrumentation for latency measurement absent" as MISSING. However, the infrastructure already exists:

- `src/runtime/profiler.js` — `startMark`, `endMark`, `getMetrics`, `measurePipeline`
- `src/runtime/stt.js` — already uses `startMark('stt')` / `endMark('stt')`
- `src/runtime/tts.js` — already uses `startMark('tts')` / `endMark('tts')`
- `src/runtime/llm.js` — already uses `startMark('llm')` / `endMark('llm')`
- `src/server/api.js` — already exposes `GET /api/perf` returning `getMetrics()`

**The task is therefore verification + potential enhancement, not greenfield implementation.**

## Files to Review/Modify

### 1. `src/runtime/profiler.js` (review only)
Current API:
```javascript
startMark(label: string) → void
endMark(label: string) → number | null
getMetrics() → { [label]: { last: number, avg: number, count: number } }
measurePipeline(stages: Array<{durationMs: number}>) → { stages, total, totalMs, pass: boolean }
```

### 2. `src/runtime/memory.js` (possible enhancement)
If memory.js has embed + search operations that are NOT profiled, add:
```javascript
import { startMark, endMark } from './profiler.js'
// Wrap embed calls with startMark('embed') / endMark('embed')
// Wrap search calls with startMark('memory-search') / endMark('memory-search')
```

### 3. `src/server/api.js` — `/api/voice` endpoint (possible enhancement)
The `/api/voice` endpoint (lines 150–178) manually logs latency with `Date.now()`. Optionally enhance to also use profiler marks:
```javascript
startMark('voice-pipeline');
// ... STT → LLM → TTS ...
endMark('voice-pipeline');
```
This allows `/api/perf` to report full pipeline timing.

### 4. `test/m80-profiler.test.js` (verify existing tests pass)
### 5. `test/m88-profiler-metrics.test.js` (verify existing tests pass)

## Implementation Steps

1. Verify existing profiler tests pass: `npx vitest run test/m80-profiler.test.js test/m88-profiler-metrics.test.js`
2. Test `/api/perf` endpoint integration (check that `getMetrics()` is properly imported in `api.js:9` and exposed at `api.js:180`)
3. Check `memory.js` for unprofiled operations — add profiler marks if missing
4. Optionally add `voice-pipeline` profiler mark to `/api/voice` endpoint
5. Re-run tests to confirm nothing breaks

## Function Signatures

```javascript
// profiler.js — existing
function startMark(label: string): void
function endMark(label: string): number | null
function getMetrics(): Record<string, { last: number, avg: number, count: number }>
function measurePipeline(stages: Array<{ durationMs: number }>): { stages, total, totalMs, pass: boolean }
```

## Edge Cases
- `endMark()` returns `null` if no matching `startMark()` — callers must handle null
- Metrics accumulate across requests — `getMetrics()` returns lifetime stats, not per-request
- Profiler uses `Date.now()` (wall clock) not `performance.now()` — acceptable for ms-level latency tracking

## Dependencies
- None — all dependent modules (stt, tts, llm) already import profiler

## Verification
- `npx vitest run test/m80-profiler.test.js test/m88-profiler-metrics.test.js` — all pass
- `curl localhost:3000/api/perf` after a chat request returns timing data
- Vision gap evaluation shows this gap resolved
