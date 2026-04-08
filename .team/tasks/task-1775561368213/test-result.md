# Test Result: CPU Profiling and Voice Latency Instrumentation

## Summary
All tests passed.

## Tests Run

### test/latency.test.js (vitest)
- ✅ STT + LLM + TTS end-to-end < 2000ms (1807ms)
- ✅ assertion is valid: slow pipeline fails

### test/benchmark/voice-latency.test.js (node)
- ✅ p95 latency 1807ms <= 2000ms
- ✅ api.js logs [voice] latency: per request
- ✅ api.js logs LATENCY EXCEEDED when threshold exceeded
- ✅ benchmark measures STT+LLM+TTS stages
- ✅ benchmark exits with code 1 on failure

### test/m80-profiler.test.js (vitest) — new
- ✅ endMark returns elapsed >= 0
- ✅ endMark returns null for unknown label
- ✅ measurePipeline totals stages and passes when < 2000ms
- ✅ measurePipeline fails when >= 2000ms

## Pass/Fail
- Total: 10 tests
- Passed: 10
- Failed: 0

## Implementation Verified
- `src/runtime/profiler.js` — startMark/endMark/measurePipeline implemented correctly
- `src/runtime/stt.js` — profiler integrated, `transcribe._lastMs` set
- `src/runtime/tts.js` — profiler integrated, `synthesize._lastMs` set
- `src/server/brain.js` — profiler integrated, `chat._lastMs` set
- `src/server/api.js` — logs `[voice] latency:` and `LATENCY EXCEEDED` when >2000ms
- `test/benchmark/voice-latency.js` — measures STT+LLM+TTS, exits 1 on failure

## Edge Cases
- endMark with no matching startMark returns null (no crash) ✅
- _lastMs is undefined before first call — benchmark guards with `?? 0` ✅
- Concurrent calls to same stage: last one wins (acceptable for sequential pipeline)
