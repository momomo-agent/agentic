# Design: Fix optimizer.js hardware-adaptive config output shape mismatch

## Problem
Tests in `test/m74-optimizer.test.js` assert specific output shapes from `optimize()`. The current implementation has edge case bugs:
- `cpu.cores` undefined → `threads` should be `2` (fallback), but `cpu.cores ?? 2` works; verify no regression
- AMD GPU falls through to CPU fallback — correct behavior, tests verify this
- nvidia with no vram → `memoryLimit = floor(memory * 0.5 * 0.8)` — current code uses `gpu.vram ?? memory * 0.5` then `* 0.8`, which is correct

## File to Modify
- `src/detector/optimizer.js`

## Current State
```js
export function optimize(hardware) {
  const { gpu, memory, cpu } = hardware;
  if (gpu.type === 'apple-silicon') {
    return { threads: 8, memoryLimit: Math.floor(memory * 0.75), model: 'gemma4:26b', quantization: 'q8' };
  }
  if (gpu.type === 'nvidia') {
    const vram = gpu.vram ?? memory * 0.5;
    return { threads: 4, memoryLimit: Math.floor(vram * 0.8), model: 'gemma4:13b', quantization: 'q4' };
  }
  return { threads: cpu.cores ?? 2, memoryLimit: Math.floor(memory * 0.5), model: 'gemma2:2b', quantization: 'q4' };
}
```

## Fix
The logic is correct but the output is missing a `hardware` key that tests may expect, OR the test is checking exact numeric values that expose a rounding issue. Run the test to confirm exact failure, then fix the specific mismatch.

Based on test assertions:
- `r1`: `{ threads: 2, memoryLimit: 4 }` — `floor(8 * 0.5) = 4` ✓
- `r2`: `{ threads: 6, memoryLimit: 8 }` — `floor(16 * 0.5) = 8` ✓
- `r3`: `memoryLimit = floor(32 * 0.5 * 0.8) = floor(12.8) = 12` ✓
- `r4`: `memoryLimit = floor(10 * 0.75) = 7` ✓

The current implementation should already pass. The actual bug is likely that `optimize` is not exported from the package entry point or there's an import path issue.

## Files to Check/Modify
- `src/detector/optimizer.js` — verify exports are correct
- `package.json` exports map — ensure `optimizer.js` is accessible

## Function Signatures
```js
export function optimize(hardware: HardwareInfo): OptimizerConfig
// OptimizerConfig: { threads: number, memoryLimit: number, model: string, quantization: string }
```

## Edge Cases
- `cpu.cores` undefined → `threads = 2`
- `gpu.vram` undefined (nvidia) → `vram = memory * 0.5`
- AMD/unknown GPU → falls through to CPU fallback branch

## Test Cases
- `test/m74-optimizer.test.js` — all 4 assertions must pass
