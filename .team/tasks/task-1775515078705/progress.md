# VAD自动语音检测集成

## Changes
- `useVAD.js`: rewrote to spec — fftSize=512, 3 consecutive frames for speechstart, 500ms silence for speechend, AudioContext resume on start
- `ChatBox.vue`: exposed `stopRecording` → `ptt.value?.stop()`

## Notes
- VAD delegates recording to PTT via ChatBox refs; no duplicate MediaRecorder
- getUserMedia error propagates to App.vue which shows error and stays in PTT mode
