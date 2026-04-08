# Task Design: VAD自动检测实现

## Files to Create/Modify

- **CREATE** `src/ui/client/src/composables/useVAD.js`
- **MODIFY** `src/ui/client/src/components/PushToTalk.vue`

## useVAD.js

```js
// useVAD(onStart, onStop, options)
// options: { threshold = 0.01, silenceMs = 1500 }
export function useVAD(onStart, onStop, options = {})
```

**Algorithm:**
1. `getUserMedia({ audio: true })` → AudioContext → ScriptProcessorNode (4096 samples)
2. Each `onaudioprocess`: compute RMS = sqrt(mean(samples^2))
3. RMS > threshold AND not recording → call `onStart()`, set recording=true, start silence timer reset
4. RMS < threshold AND recording → after `silenceMs` of continuous silence → call `onStop()`, recording=false
5. Returns `{ start(), stop(), isActive }` — `stop()` tears down AudioContext

## PushToTalk.vue changes

- Add `vadMode` ref (default `true`)
- When `vadMode=true`: call `useVAD(startRecording, stopRecording)` on mount
- When `vadMode=false`: keep existing mousedown/mouseup logic
- UI: toggle button between "VAD" and "PTT" modes
- `startRecording` / `stopRecording` reuse existing MediaRecorder + fetch `/api/transcribe` logic

## Edge Cases

- Mic permission denied → catch, emit `error` event, fall back to PTT mode
- Page hidden (visibilitychange) → pause VAD to avoid spurious triggers
- Multiple rapid start/stop → debounce with 300ms minimum recording duration

## Test Cases

- RMS above threshold → `onStart` called once (not repeatedly)
- Silence after speech → `onStop` called after silenceMs
- Background noise below threshold → no trigger
- Mic denied → error emitted, no crash
