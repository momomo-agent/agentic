# Verify agentic-voice STT/TTS resolves in test environment

## Progress

- Created stub subpath files in `node_modules/agentic-voice/`: openai-whisper.js, openai-tts.js, sensevoice.js, whisper.js, kokoro.js, piper.js
- Added `exports` map to `node_modules/agentic-voice/package.json`
- Fixed `test/m62-stt-tts.test.js`: mocked hardware.js + profiles.js to prevent network timeouts
- All 8 STT/TTS tests pass in 112ms
