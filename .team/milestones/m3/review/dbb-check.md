# M3 DBB Check

**Match: 75%** | 2026-04-06T21:06:17Z

## Pass
- stt.js exports transcribe(audioBuffer): empty buffer throws EMPTY_AUDIO (400)
- tts.js exports synthesize(text): empty text throws EMPTY_TEXT (400)
- POST /api/transcribe: multer multipart, returns {text}
- POST /api/synthesize: returns audio/wav binary
- agentic-voice unavailable: adapter falls back to default (openai), throws if all fail
- STT/TTS unit tests present (test/server/stt.test.js, tts.test.js)
- Integration tests present (transcribe-api, tts-api)

## Partial
- /admin panel: static files served from dist/admin but admin UI build not confirmed
- /admin hardware/profile/logs panels: depends on frontend build

## Missing
- No evidence admin UI is built and deployed to dist/admin
