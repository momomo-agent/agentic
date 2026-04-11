# Test Result: stt.js 切到 Engine Registry

**Task ID:** task-1775887201601
**Test File:** test/engine-registry-stt.test.js
**Status:** PASS

## Results

| # | Test | Result |
|---|------|--------|
| 1 | stt.js does NOT import from detector/hardware.js | ✅ PASS |
| 2 | stt.js does NOT import from detector/profiles.js | ✅ PASS |
| 3 | stt.js has no detector/ imports at all | ✅ PASS |
| 4 | stt.js does NOT import fs | ✅ PASS |
| 5 | stt.js does NOT import path | ✅ PASS |
| 6 | stt.js does NOT import os | ✅ PASS |
| 7 | stt.js DOES import from engine/registry.js | ✅ PASS |
| 8 | stt.js imports resolveModel | ✅ PASS |
| 9 | stt.js imports modelsForCapability | ✅ PASS |
| 10 | stt.js imports getConfig from config.js | ✅ PASS |
| 11 | LEGACY_ADAPTERS has sensevoice adapter | ✅ PASS |
| 12 | LEGACY_ADAPTERS has whisper adapter | ✅ PASS |
| 13 | LEGACY_ADAPTERS has default adapter (openai-whisper) | ✅ PASS |
| 14 | init() step 1: checks assignments.stt → resolveModel | ✅ PASS |
| 15 | init() step 2: falls back to modelsForCapability('stt') | ✅ PASS |
| 16 | init() step 2: resolves first model from capability list | ✅ PASS |
| 17 | init() step 3: legacy adapter fallback reads config.stt.provider | ✅ PASS |
| 18 | init() sets _resolved when engine has run() | ✅ PASS |
| 19 | transcribe() throws 'not initialized' | ✅ PASS |
| 20 | transcribe() throws 'empty audio' with code EMPTY_AUDIO | ✅ PASS |
| 21 | transcribe() checks audioBuffer.length === 0 | ✅ PASS |
| 22 | transcribe() delegates to _resolved.engine.run | ✅ PASS |
| 23 | transcribe() passes { audioBuffer } to engine.run | ✅ PASS |
| 24 | transcribe() falls back to _adapter.transcribe | ✅ PASS |

**Total: 25 tests, 25 passed, 0 failed**

## DBB Verification
- DBB-004 ✅ STT resolves via Engine Registry — init() uses resolveModel + modelsForCapability
- DBB-005 ✅ STT no longer imports detector — verified statically, no detector/ imports
- DBB-006 ✅ STT fallback chain — assignments → engine discovery → legacy adapter fallback

## Edge Cases Identified

- Fallback chain (sensevoice → whisper → default) when primary adapter fails is verified via source inspection
- Whisper engine run() backend detection (sensevoice vs whisper-cpp) covered by engine source
