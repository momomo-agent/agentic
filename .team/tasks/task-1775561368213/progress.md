# CPU profiling and voice latency instrumentation

## Progress

- Created `src/runtime/profiler.js` with startMark/endMark/measurePipeline
- Modified stt.js, tts.js to store `_lastMs` via profiler
- Modified brain.js chat() generator to store `_lastMs`
- Updated test/benchmark/voice-latency.js to use real imports + profiler
- api.js already had latency logging — no changes needed
