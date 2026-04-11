# POST /v1/audio/speech — OpenAI 兼容语音合成 API

## Progress

- Added POST /v1/audio/speech to api.js
- Accepts `{ model, input, voice, response_format, speed }`
- Routes through runtime/tts.js synthesize()
- Sets Content-Type based on response_format (mp3/wav/opus/flac)
- Test: test/v1-audio-speech.test.js — 5 tests passing
- Verified: full suite 187 files, 1117 tests, all passing
