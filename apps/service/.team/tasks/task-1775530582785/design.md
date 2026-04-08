# Design: Server-side VAD silence suppression (m77)

## File to modify
- `src/server/hub.js`

## Helper function
```js
function isSilent(buffer) {
  if (!buffer?.byteLength) return true;
  const floats = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  const rms = Math.sqrt(floats.reduce((s, v) => s + v * v, 0) / floats.length);
  return rms < 0.01;
}
```

## Integration
In `init()` wakeword audio handler, call `isSilent(chunk)` and return early if true. `brainChat` must not be called for silent frames.

## Test cases
- Zero buffer → silent, `brainChat` not called
- RMS > 0.01 buffer → not silent, pipeline proceeds
