# 语音UI控件

## Progress

## Implemented
- `PushToTalk.vue` — mousedown/touchstart starts MediaRecorder, mouseup/touchend stops and POSTs to /api/transcribe, emits `transcribed(text)`
- `useVAD.js` — Web Audio API VAD, RMS < 0.01 for 1.5s triggers onSpeechEnd(blob)
- `useWakeWord.js` — setWakeWord/check, case-insensitive substring match
- `ChatBox.vue` — integrated PushToTalk + useWakeWord, loads wakeWord from /api/config on mount, auto-submits on wake word match, else fills input
- `InputBox.vue` — exposed `setText` via defineExpose

## Assumptions
- ChatBox.vue serves as ChatView per design intent
- InputBox needed `defineExpose({ setText })` to allow parent to fill input field
