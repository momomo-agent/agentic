# VAD Auto-Detection — Technical Design

## Files to Modify
- `src/ui/client/src/composables/useVAD.js` — implement VAD logic

## Approach
Use the Web Audio API `AudioWorkletProcessor` or `ScriptProcessorNode` to compute RMS energy per frame. Speech start fires when RMS exceeds threshold for N consecutive frames; speech end fires when RMS drops below threshold for M consecutive frames.

## Function Signatures
```js
// src/ui/client/src/composables/useVAD.js
export function useVAD(options: {
  onStart: () => void,
  onStop: () => void,
  threshold?: number,   // default 0.01
  silenceMs?: number,   // ms of silence before onStop, default 1200
}): {
  start(): Promise<void>,
  stop(): void,
}
```

## Algorithm
1. `start()`: request mic via `getUserMedia`, create `AudioContext`, connect source → `ScriptProcessorNode` (bufferSize 2048)
2. On each `onaudioprocess`: compute RMS of `inputBuffer.getChannelData(0)`
3. If RMS > threshold and not speaking: set `speaking=true`, call `onStart()`
4. If RMS < threshold and speaking: debounce `silenceMs` then set `speaking=false`, call `onStop()`
5. `stop()`: disconnect nodes, close `AudioContext`, clear timers

## Edge Cases
- `NotAllowedError` on mic permission → propagate, caller shows error (already handled in App.vue)
- `AudioContext` suspended (autoplay policy) → call `resume()` before processing
- Multiple `start()` calls → guard with `if (audioCtx) return`

## Dependencies
- No external libs — Web Audio API only
- Called from `App.vue` `toggleVAD()`

## Test Cases
- RMS above threshold → `onStart` fires within one frame
- RMS drops below threshold for `silenceMs` → `onStop` fires
- `stop()` cleans up AudioContext (no memory leak)
