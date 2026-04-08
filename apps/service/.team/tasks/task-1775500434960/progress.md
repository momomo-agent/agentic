# STT/TTS 完整性修复

## Progress

- Added fallback logic to stt.js init(): local adapter load failure → falls back to ADAPTERS.default
- Added fallback logic to tts.js init(): same pattern
- Existing EMPTY_AUDIO / EMPTY_TEXT guards already in place
