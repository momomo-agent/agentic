# 音频格式校验 — transcriptions 端点前置检查

## Progress

- Implementation already present in `src/server/api.js` (AUDIO_SIGNATURES + isValidAudio + handler check)
- Tests in `test/server/m103-audio-validation.test.js` — 5/5 passing
- Updated 4 existing test files to use valid WAV headers for audio uploads
- Full suite: 201 test files, 1207 tests pass
