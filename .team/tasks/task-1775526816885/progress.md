# Server-side VAD silence suppression

## Progress

- Created `src/runtime/vad.js` with `detectVoiceActivity(buffer)` using RMS energy threshold
- Updated `src/server/api.js` POST /api/transcribe to skip STT and return `{ text: '', skipped: true }` on silence
