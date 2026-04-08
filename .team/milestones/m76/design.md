# M76 Technical Design: cpu-only Profile + Server-Side VAD + optimizer.js Fix

## task-1775530542647: cpu-only profile
- File: `profiles/default.json`
- Update existing `{ "match": { "gpu": "none" } }` entry to use `gemma3:1b` q4 (currently `gemma2:2b`)
- Ensures cpu-only systems get the lightest model

## task-1775530548652: Server-side VAD
- File: `src/server/hub.js`
- Add `isSilent(buffer: Buffer, threshold=0.01): boolean` — reads PCM16 samples, computes RMS, returns true if below threshold
- In `init()` wakeword handler, call `isSilent(chunk)` on each audio chunk; skip `brainChat()` if silent

## task-1775530556380: optimizer.js fix
- File: `src/detector/optimizer.js`
- Current implementation is already correct (returns `{ threads, memoryLimit, model, quantization }`)
- Verify: no ollama install/exec code present; all three GPU branches covered (apple-silicon, nvidia, fallback)
