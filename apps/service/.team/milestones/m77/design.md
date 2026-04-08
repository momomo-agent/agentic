# M77 Technical Design

## Tasks
1. Server-side VAD silence suppression (hub.js)
2. Fix optimizer.js hardware-adaptive config output
3. Add cpu-only profile to profiles/default.json

## Approach

### VAD in hub.js
Add `isSilent(buffer)` helper that computes RMS of Float32Array. In the wakeword audio pipeline, drop frames where RMS < 0.01 before passing to STT/brain.

### optimizer.js
Current `optimize()` already returns correct shape. Verify it handles `gpu.type === 'none'` (cpu-only) case with `gemma2:2b`.

### profiles/default.json
Add explicit `cpu-only` match entry between the `nvidia` and `none` entries.
