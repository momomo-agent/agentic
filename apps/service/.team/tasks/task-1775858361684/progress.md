# Add voice adapter API signatures to ARCHITECTURE.md

## Progress

### Verification (2026-04-11)

Confirmed ARCHITECTURE.md §11 (lines 459-482) already contains complete voice adapter API signatures:

- STT: sensevoice (check + transcribe), whisper (check + transcribe), openaiWhisper (transcribe)
- TTS: kokoro, piper, openaiTts, elevenlabs, macosSay (synthesize + listVoices)

All signatures match source code. No changes required — task already addressed.
