# M71 Technical Design

## task-1775528326243: Server-side VAD silence suppression

VAD is already implemented in `src/runtime/vad.js` and wired in `src/server/api.js`. The `/api/transcribe` endpoint already calls `detectVoiceActivity(buffer)` and returns `{ text: '', skipped: true }` for silence. **This task is already complete** — verify by running tests.

## task-1775528897750: optimizer.js hardware-adaptive config

**File:** `src/detector/optimizer.js`

Current implementation already returns `{ threads, memoryLimit, model }` but is missing `quantization`. Fix:

```js
export function optimize(hardware) {
  const { gpu, memory, cpu } = hardware;
  if (gpu.type === 'apple-silicon')
    return { threads: 8, memoryLimit: Math.floor(memory * 0.75), model: 'gemma4:26b', quantization: 'q8' };
  if (gpu.type === 'nvidia') {
    const vram = gpu.vram ?? memory * 0.5;
    return { threads: 4, memoryLimit: Math.floor(vram * 0.8), model: 'gemma4:13b', quantization: 'q4' };
  }
  return { threads: cpu.cores ?? 2, memoryLimit: Math.floor(memory * 0.5), model: 'gemma2:2b', quantization: 'q4' };
}
```

## task-1775528904107: cpu-only profile in profiles/default.json

**File:** `profiles/default.json`

The `{ "match": { "gpu": "none" } }` entry already exists. **This task is already complete** — verify the entry is present.
