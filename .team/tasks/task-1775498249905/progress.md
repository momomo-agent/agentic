# STT/TTS 硬件自适应选择

## Progress

- stt.js: Already had profile-based adapter selection — no changes needed
- tts.js: Rewrote to use profile-based adapter selection (kokoro/piper/openai-tts)
- api.js: Added stt.init() + tts.init() calls on server listening event
