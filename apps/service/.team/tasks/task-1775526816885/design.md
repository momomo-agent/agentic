# Design: Server-side VAD silence suppression

## File to create
`src/runtime/vad.js`

```javascript
const SILENCE_THRESHOLD = 0.01; // RMS energy threshold

export function detectVoiceActivity(buffer) {
  const samples = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += (samples[i] / 32768) ** 2;
  const rms = Math.sqrt(sum / samples.length);
  return rms > SILENCE_THRESHOLD;
}
```

## File to modify
`src/server/api.js` — in `POST /api/transcribe` handler:

```javascript
import { detectVoiceActivity } from '../runtime/vad.js';

// Before STT call:
if (!detectVoiceActivity(req.file.buffer)) {
  return res.json({ text: '', skipped: true });
}
```

## Edge cases
- Empty buffer → return false (no speech)
- Non-PCM audio format → VAD may be inaccurate; acceptable for MVP
- Buffer length < 2 bytes → return false

## Test cases
- Silent buffer (all zeros) → `detectVoiceActivity` returns false
- Buffer with non-zero samples above threshold → returns true
- POST /api/transcribe with silence → response `{ text: '', skipped: true }`, no STT call
