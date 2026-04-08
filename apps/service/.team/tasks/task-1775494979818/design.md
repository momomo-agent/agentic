# Design: 语音UI控件

## Files
- `src/ui/client/components/PushToTalk.vue`
- `src/ui/client/composables/useVAD.js`
- `src/ui/client/composables/useWakeWord.js`

## PushToTalk.vue
- Button: `@mousedown`/`@touchstart` → start MediaRecorder
- `@mouseup`/`@touchend` → stop, send blob to POST /api/transcribe
- On result: emit `transcribed(text)` → parent fills input

## useVAD.js
```js
// Web Audio API silence detection
startVAD(onSpeechEnd: (audioBlob) => void)
stopVAD()
// Analyser node: if RMS < threshold for 1.5s → onSpeechEnd(blob)
```

## useWakeWord.js
```js
// Configurable keyword matching on transcription result
setWakeWord(word: string)
check(text: string) → boolean  // true if text contains wakeWord
```
- Wake word config stored in /api/config under `wakeWord` key

## Integration in ChatView.vue
- Import PushToTalk, useVAD, useWakeWord
- On transcribed text: check wake word → if match, auto-submit

## Test Cases
- PushToTalk mousedown → MediaRecorder starts
- PushToTalk mouseup → POST /api/transcribe called
- useVAD silence detection → onSpeechEnd fires after threshold
- useWakeWord.check("hey momo start") with wakeWord="hey momo" → true
