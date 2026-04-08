# Design: Server-side VAD silence suppression

## Status
Already implemented. Verify only.

## Files
- `src/runtime/vad.js` — `detectVoiceActivity(buffer: Buffer): boolean`
- `src/server/api.js` — `/api/transcribe` calls `detectVoiceActivity` before STT

## Logic
```js
// vad.js
const SILENCE_THRESHOLD = 0.01;
export function detectVoiceActivity(buffer) {
  if (!buffer || buffer.byteLength < 2) return false;
  const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += (samples[i] / 32768) ** 2;
  return Math.sqrt(sum / samples.length) > SILENCE_THRESHOLD;
}

// api.js /api/transcribe
if (!detectVoiceActivity(req.file.buffer)) return res.json({ text: '', skipped: true });
```

## Test cases
- Silent buffer (all zeros) → `{ text: '', skipped: true }`
- Non-silent buffer → calls `stt.transcribe()`, returns `{ text: '...' }`
- Missing audio → 400 error
