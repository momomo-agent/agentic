# VAD auto-detection

## Progress

- Rewrote useVAD.js to match design spec: `useVAD({ onStart, onStop, threshold, silenceMs })`
- Uses ScriptProcessorNode (bufferSize 2048), RMS energy detection, silence debounce
- Guards against multiple start() calls, resumes suspended AudioContext
