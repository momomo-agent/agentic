# Test Result: tts.js 切到 Engine Registry

**Task ID:** task-1775887201640
**Test File:** test/engine-registry-tts.test.js
**Status:** PASS

## Results

| # | Test | Result |
|---|------|--------|
| 1 | tts.js does NOT import from detector/hardware.js | ✅ PASS |
| 2 | tts.js does NOT import from detector/profiles.js | ✅ PASS |
| 3 | tts.js has no detector/ imports at all | ✅ PASS |
| 4 | tts.js does NOT import fs | ✅ PASS |
| 5 | tts.js does NOT import path | ✅ PASS |
| 6 | tts.js does NOT import os | ✅ PASS |
| 7 | tts.js DOES import from engine/registry.js | ✅ PASS |
| 8 | tts.js imports resolveModel | ✅ PASS |
| 9 | tts.js imports modelsForCapability | ✅ PASS |
| 10 | tts.js imports getConfig from config.js | ✅ PASS |
| 11 | ADAPTERS has macos-say adapter | ✅ PASS |
| 12 | ADAPTERS has piper adapter | ✅ PASS |
| 13 | ADAPTERS has kokoro adapter | ✅ PASS |
| 14 | ADAPTERS has elevenlabs adapter | ✅ PASS |
| 15 | ADAPTERS has openai adapter | ✅ PASS |
| 16 | ADAPTERS has default adapter (openai-tts) | ✅ PASS |
| 17 | init() step 1: checks assignments.tts → resolveModel | ✅ PASS |
| 18 | init() step 2: falls back to modelsForCapability('tts') | ✅ PASS |
| 19 | init() step 3: legacy adapter fallback with platform detection | ✅ PASS |
| 20 | synthesize() throws 'not initialized' | ✅ PASS |
| 21 | synthesize() throws 'text required' with code EMPTY_TEXT | ✅ PASS |
| 22 | synthesize() guards whitespace-only text via trim() | ✅ PASS |
| 23 | synthesize() delegates to _resolved.engine.run | ✅ PASS |
| 24 | synthesize() delegates to _adapter.synthesize | ✅ PASS |
| 25 | TTS engine has run() method | ✅ PASS |
| 26 | TTS engine run() accepts modelName and input | ✅ PASS |
| 27 | TTS engine run() throws 'Unknown TTS model' for bad model | ✅ PASS |
| 28 | TTS engine has status(), models(), recommended() | ✅ PASS |
| 29 | TTS engine adapterMap covers expected backends | ✅ PASS |
| 30 | Live import: run() rejects unknown model | ✅ PASS |
| 31 | Live import: has run as function | ✅ PASS |
| 32 | Live import: has status, models, recommended | ✅ PASS |

**Total: 32 tests, 32 passed, 0 failed**

## DBB Verification
- DBB-007 ✅ TTS resolves via Engine Registry — init() uses resolveModel + modelsForCapability
- DBB-008 ✅ TTS no longer imports hardware profile — verified statically, no detector/ imports
- DBB-009 ✅ TTS backend switchable via assignments — init() checks assignments.tts first

## Edge Cases Identified

- Platform default (macos-say on darwin, openai-tts elsewhere) verified via source inspection
- Cloud TTS via cloud engine's ttsText input path tested in brain test file
