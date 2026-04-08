# Progress

## Status: Complete

Created src/runtime/latency-log.js — in-memory singleton with record(), p95(), reset().

Updated:
- src/runtime/stt.js — imports record, calls record('stt', ms) after transcribe()
- src/runtime/tts.js — imports record, calls record('tts', ms) after synthesize()
- src/runtime/llm.js — imports record, records llm_ttft on first chunk, llm_total in finally block

Created test/m80-voice-latency.test.js — simulates N=20 runs, asserts p95 < 2000ms.
Test passes: p95 pipeline ~278ms.
