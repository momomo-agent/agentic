# M76 DBB: cpu-only Profile + Server-Side VAD + optimizer.js Fix

## Verification Criteria

1. `profiles/default.json` contains a profile entry matching `gpu: "cpu-only"` or `gpu.type === 'none'`
2. cpu-only profile specifies model `gemma3:1b` or `gemma2:2b` with `q4` quantization
3. `src/server/hub.js` wakeword pipeline filters silent audio frames (RMS < threshold) before STT
4. Silent audio does not reach `brainChat()` — verified by unit test
5. `src/detector/optimizer.js` `optimize()` returns `{ threads, memoryLimit, model, quantization }` for all hardware types
6. `optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } })` returns valid config with all four fields
