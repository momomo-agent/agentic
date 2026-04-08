# Add voice latency benchmark test (STT+LLM+TTS <2s)

## Progress

Created `test/m88-voice-latency-benchmark.test.js` with 2 tests:
1. Pass case: STT(80ms)+LLM(300ms)+TTS(80ms) = 460ms < 2000ms
2. Fail case: total >= 2000ms → pass=false

Both tests pass (vitest confirmed).

