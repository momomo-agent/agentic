# M8 DBB Check

**Match: 65%** | 2026-04-06T21:06:17Z

## Pass
- sense.js emits face_detected, gesture_detected events via on()/emit()
- hub.js broadcasts wakeword via broadcastWakeword()
- stt.js: sensevoice local-first, falls back to openai-whisper
- tts.js: kokoro local-first, falls back to openai-tts

## Partial
- Wakeword UI activation: hub.js handles 'wakeword' WS message and broadcasts, but frontend wakeword detection UI not verified
- Wakeword configurable via PUT /api/config: config stored but wakeword detection reload not confirmed
