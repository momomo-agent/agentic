# M88 DBB — Voice Latency Benchmarking + CPU Profiling

## Done-By-Definition Criteria

### 1. Voice Latency Benchmark Test
- [ ] `test/benchmark/voice-latency.test.js` exists and runs via `npm test`
- [ ] Test measures STT → LLM → TTS pipeline end-to-end with mocked providers
- [ ] Asserts total pipeline completes in < 2000ms
- [ ] Test passes in CI

### 2. CPU Profiling Instrumentation
- [ ] `src/runtime/profiler.js` exists with `startTimer(stage)` / `endTimer(stage)` API
- [ ] `src/runtime/stt.js`, `src/runtime/llm.js`, `src/runtime/tts.js` each wrap their core call with profiler timers
- [ ] Metrics stored in-memory, accessible via `profiler.getMetrics()`

### 3. /api/perf Endpoint
- [ ] `GET /api/perf` returns JSON: `{ stt: { last, avg, count }, llm: { last, avg, count }, tts: { last, avg, count } }`
- [ ] Endpoint wired in `src/server/api.js`
- [ ] Returns 200 with empty metrics if no requests processed yet
