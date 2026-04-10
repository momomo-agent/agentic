# Progress: Fix missing kokoro.js adapter

## Status: Complete

- `src/runtime/adapters/voice/kokoro.js` already exists on disk (35 lines)
- Exports `synthesize(text)` matching the adapter contract
- Uses `http://localhost:8880/v1/audio/speech` (OpenAI-compatible endpoint)
- Reads config from `~/.agentic-service/config.json` for baseUrl/voice overrides
- All TTS tests pass: m38-tts (1/1), server/tts (6/6)
