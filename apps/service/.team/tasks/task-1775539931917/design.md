# Design: Fix optimizer.js — Hardware Optimization Logic

## Status
The file `src/detector/optimizer.js` already contains the correct implementation. This design documents what it does and what to verify.

## File
- `src/detector/optimizer.js` — no changes needed (already correct)

## Function Signature
```js
export function optimize(hardware: {
  gpu: { type: 'apple-silicon' | 'nvidia' | 'amd' | 'none', vram?: number },
  memory: number,  // GB
  cpu: { cores: number }
}) → {
  threads: number,
  memoryLimit: number,
  model: string,
  quantization: string
}
```

## Logic
- `apple-silicon`: 8 threads, 75% memory, gemma4:26b q8
- `nvidia`: 4 threads, 80% vram, gemma4:13b q4
- fallback (amd/none): cpu.cores threads, 50% memory, gemma2:2b q4

## Edge Cases
- `gpu.vram` may be undefined for nvidia → falls back to `memory * 0.5`
- `cpu.cores` may be undefined → defaults to 2

## Test Cases
1. `optimize({ gpu: { type: 'apple-silicon' }, memory: 16, cpu: { cores: 8 } })` → `{ threads: 8, memoryLimit: 12, model: 'gemma4:26b', quantization: 'q8' }`
2. `optimize({ gpu: { type: 'nvidia', vram: 8 }, memory: 32, cpu: { cores: 4 } })` → `{ threads: 4, memoryLimit: 6, model: 'gemma4:13b', quantization: 'q4' }`
3. `optimize({ gpu: { type: 'none' }, memory: 8, cpu: { cores: 4 } })` → `{ threads: 4, memoryLimit: 4, model: 'gemma2:2b', quantization: 'q4' }`
4. nvidia with no vram field → uses `memory * 0.5`
5. cpu.cores undefined → threads = 2
