# agentic-voice package integration — stt.js + tts.js

## Progress

- agentic-voice not on npm — implemented local adapters (Option B)
- Created src/runtime/adapters/voice/: openai-whisper.js, openai-tts.js, sensevoice.js, kokoro.js, piper.js
- Added `imports` map to package.json so `agentic-voice/*` resolves to local adapters
