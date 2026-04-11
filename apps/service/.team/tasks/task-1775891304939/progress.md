# POST /v1/audio/transcriptions — OpenAI 兼容语音识别 API

## Progress

- Added POST /v1/audio/transcriptions to api.js
- Accepts multipart/form-data with `file` field, optional `model`, `language`, `response_format`
- Uses existing multer upload middleware
- Routes through runtime/stt.js transcribe()
- Supports `json` (default) and `verbose_json` response formats
- Test: test/v1-audio-transcriptions.test.js — 4 tests passing
