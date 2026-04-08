# M88 Technical Design — Voice Latency Benchmarking + CPU Profiling

## Approach

### Profiler Module (new)
`src/runtime/profiler.js` — singleton in-memory metrics store.

```js
// API
startTimer(stage: string): symbol  // returns handle
endTimer(handle: symbol): number   // returns elapsed ms
getMetrics(): { [stage]: { last: number, avg: number, count: number } }
reset(): void
```

Metrics stored as `Map<stage, { sum, count, last }>`. Thread-safe (single-threaded Node.js).

### Runtime Instrumentation
Wrap existing calls in `stt.js`, `llm.js`, `tts.js`:
```js
const h = profiler.startTimer('stt')
const result = await originalCall(...)
profiler.endTimer(h)
```

### /api/perf Endpoint
Add to `src/server/api.js`:
```js
GET /api/perf → profiler.getMetrics()
```

### Benchmark Test
`test/benchmark/voice-latency.test.js` — mocks STT/LLM/TTS providers with artificial delays, runs pipeline, asserts total < 2000ms.

## File Changes
- **create** `src/runtime/profiler.js`
- **modify** `src/runtime/stt.js` — wrap transcribe()
- **modify** `src/runtime/llm.js` — wrap chat()
- **modify** `src/runtime/tts.js` — wrap synthesize()
- **modify** `src/server/api.js` — add GET /api/perf
- **create** `test/benchmark/voice-latency.test.js`
