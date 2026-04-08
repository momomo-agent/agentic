# Design: Server-side VAD silence suppression (m76)

## File to modify
- `src/server/hub.js`

## Function to add
```js
function isSilent(buffer) {
  // buffer: Buffer (raw PCM float32 LE)
  const floats = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  const rms = Math.sqrt(floats.reduce((s, v) => s + v * v, 0) / floats.length);
  return rms < 0.01;
}
```

## Integration point
In the wakeword audio pipeline inside `init()`, before forwarding audio to STT/brain:
```js
emitter.on('audio', (chunk) => {
  if (isSilent(chunk)) return; // drop silent frame
  // forward to STT pipeline
});
```

## Edge cases
- Empty buffer → treat as silent (return true)
- Non-float32 audio → document assumption; caller must provide float32 LE PCM

## Test cases
- Zero-filled buffer → `isSilent` returns true
- Buffer with RMS > 0.01 → `isSilent` returns false
- `brainChat` not called when all frames are silent
