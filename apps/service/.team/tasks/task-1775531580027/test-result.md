# Test Result: Voice Latency Benchmark

## Summary
- **Status**: PASSED
- **Tests**: 5 passed, 0 failed

## Results

| Test | Result |
|------|--------|
| p95 latency <= 2000ms (actual: 1807ms) | PASS |
| api.js logs `[voice] latency:` per request | PASS |
| api.js logs `LATENCY EXCEEDED` when >2000ms | PASS |
| Benchmark measures STT+LLM+TTS stages | PASS |
| Benchmark exits with code 1 on failure | PASS |

## Benchmark Metrics
- p50: 1806ms, p95: 1807ms, max: 1807ms, target: 2000ms

## Edge Cases
- VAD skips silent audio (no latency measured for skipped requests)
- Latency is wall-clock including network/model load
- Service continues even when threshold exceeded (log only, no throw)
