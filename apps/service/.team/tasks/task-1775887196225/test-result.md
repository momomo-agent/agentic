# Test Result: brain.js 切到 Engine Registry

**Task ID:** task-1775887196225
**Test File:** test/engine-registry-brain.test.js
**Status:** PASS

## Results

| # | Test | Result |
|---|------|--------|
| 1 | brain.js does NOT import getModelPool (destructure check) | ✅ PASS |
| 2 | brain.js does NOT reference getModelPool anywhere | ✅ PASS |
| 3 | brain.js DOES import resolveModel from engine/registry.js | ✅ PASS |
| 4 | brain.js DOES import modelsForCapability from engine/registry.js | ✅ PASS |
| 5 | brain.js does NOT import from detector/hardware.js | ✅ PASS |
| 6 | brain.js does NOT import from detector/profiles.js | ✅ PASS |
| 7 | brain.js has no detector/ imports at all | ✅ PASS |
| 8 | Ollama engine run() yields content chunks for chat | ✅ PASS |
| 9 | Ollama engine run() yields embedding for embed mode | ✅ PASS |
| 10 | Ollama engine run() yields tool_use chunks | ✅ PASS |
| 11 | Cloud engine run() yields content chunks for chat (SSE) | ✅ PASS |
| 12 | Cloud engine run() yields transcription for STT | ✅ PASS |
| 13 | Cloud engine run() yields audio for TTS | ✅ PASS |

**Total: 14 tests, 14 passed, 0 failed**

## DBB Verification
- DBB-001 ✅ Chat completions via Engine Registry — resolveModel delegates to registry
- DBB-002 ✅ Ollama chat endpoint unchanged — engine run() handles /api/chat format
- DBB-003 ✅ brain.js no longer imports getModelPool — verified statically
- DBB-014 ✅ All existing tests pass — 1044 tests, 0 failures (full vitest run)
- DBB-015 ✅ No regression in chat completions — chat flow preserved via engine.run()

## Edge Cases Identified

- Cloud fallback state machine (_cloudMode, _errorCount, probing) is tested by existing test/m98-cloud-fallback.test.js
- Legacy config.llm fallback path verified via source inspection
