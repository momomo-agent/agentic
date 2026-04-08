# Test Result: STT/TTS 硬件自适应选择

## Status: PASS

## Tests: 14/14 passed

### STT (stt.js) — PASSED 6/6
- DBB-005: sensevoice provider → sensevoice adapter ✓
- whisper provider → whisper adapter ✓
- DBB-006: unknown provider → openai-whisper fallback ✓
- profile load failure → default fallback ✓
- transcribe before init → throws 'not initialized' ✓
- empty audio → throws EMPTY_AUDIO ✓

### TTS (tts.js) — PASSED 8/8
- DBB-007: tts.js has init() export ✓
- DBB-007: kokoro provider → kokoro adapter ✓
- piper provider → piper adapter ✓
- DBB-008: unknown provider → openai-tts fallback ✓
- profile load failure → default fallback ✓
- synthesize before init → throws 'not initialized' ✓
- empty text → throws EMPTY_TEXT ✓
- piper synthesize returns buffer ✓

## Test files
- test/runtime/stt-tts-adaptive.test.js (8 tests)
- test/runtime/stt-adaptive.test.js (6 tests)
