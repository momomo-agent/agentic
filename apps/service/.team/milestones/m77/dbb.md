# M77 DBB: Server-side VAD + Hardware Optimizer + CPU-only Profile

## Verification Criteria

1. `src/server/hub.js` wakeword pipeline drops audio frames with RMS < 0.01 before STT
2. Silent audio does not reach `brainChat()` — verified by unit test
3. `src/detector/optimizer.js` `optimize(hardware)` returns `{ threads, memoryLimit, model, quantization }` for all GPU types
4. `optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } })` returns valid config with all four fields
5. `profiles/default.json` contains a `cpu-only` profile entry with `gemma2:2b` + `q4`
