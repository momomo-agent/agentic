# Test Result: agentic-voice package integration — stt.js + tts.js

## Summary
- Total: 8 | Passed: 8 | Failed: 0

## Results
- ✅ stt init() resolves without throwing (default adapter)
- ✅ tts init() resolves without throwing (default adapter)
- ✅ transcribe returns string after init
- ✅ synthesize returns Buffer after init
- ✅ transcribe throws EMPTY_AUDIO for empty buffer
- ✅ synthesize throws EMPTY_TEXT for blank text
- ✅ openai-whisper throws NO_API_KEY when OPENAI_API_KEY missing
- ✅ openai-tts throws NO_API_KEY when OPENAI_API_KEY missing

## Verification
- agentic-voice/* resolved via package.json imports map to local adapters ✅
- stt.js and tts.js fall back to default adapter on load failure ✅
- Edge cases: empty audio, blank text, missing API key all handled ✅
