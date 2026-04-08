# Design: Wake Word Server-Side Audio Pipeline

## Files to Modify
- `src/runtime/sense.js` — add `startWakeWordPipeline()` and `stopWakeWordPipeline()`

## Function Signatures
```js
// src/runtime/sense.js
export function startWakeWordPipeline(onWakeWord: () => void): void
export function stopWakeWordPipeline(): void
```

## Algorithm
1. Use `node-record-lpcm16` to open mic stream: `record.start({ sampleRate: 16000, channels: 1 })`
2. Pipe audio chunks through a simple energy/keyword detector (or call `detectVoiceActivity` from `src/runtime/vad.js`)
3. On detection, call `onWakeWord()` and emit `wake_word` via existing `emit()` helper
4. Store recorder ref in module-level `let _recorder = null`
5. `stopWakeWordPipeline()` calls `_recorder?.stop()` and sets `_recorder = null`

## Dependencies
- `node-record-lpcm16` (add to package.json if missing)
- `src/runtime/vad.js` — `detectVoiceActivity(buffer: Buffer): boolean`

## Edge Cases
- If `startWakeWordPipeline` called twice, stop existing recorder first
- Handle mic open error: log warning, do not throw (server must keep running)

## Test Cases
- Mock `node-record-lpcm16`, emit audio buffer with high RMS → `onWakeWord` called
- Emit silent buffer → `onWakeWord` not called
- Call `stopWakeWordPipeline` without start → no error
