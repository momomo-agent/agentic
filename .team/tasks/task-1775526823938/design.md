# Design: optimizer.js hardware-adaptive config output

## File to modify
`src/detector/optimizer.js` — replace current Ollama setup code with optimization logic.

## Function signature
```javascript
export function optimize(hardware) {
  // hardware: { gpu: { type, vram }, memory, cpu: { cores } }
  // returns: { threads: number, memoryLimit: number, model: string }
}
```

## Logic
```javascript
export function optimize(hardware) {
  const { gpu, memory, cpu } = hardware;
  if (gpu.type === 'apple-silicon') {
    return { threads: 8, memoryLimit: Math.floor(memory * 0.75), model: 'gemma4:26b' };
  }
  if (gpu.type === 'nvidia') {
    return { threads: 4, memoryLimit: Math.floor(gpu.vram * 0.8), model: 'gemma4:13b' };
  }
  // cpu-only
  return { threads: cpu.cores, memoryLimit: Math.floor(memory * 0.5), model: 'gemma2:2b' };
}
```

## Dependencies
- Called from `bin/agentic-service.js` after `detect()` and `getProfile()`
- No external imports needed

## Edge cases
- `gpu.vram` undefined for nvidia → use `memory * 0.5` as fallback
- `cpu.cores` undefined → default to 2

## Test cases
- apple-silicon, 16GB → `{ threads: 8, memoryLimit: 12, model: 'gemma4:26b' }`
- nvidia, vram=8 → `{ threads: 4, memoryLimit: 6, model: 'gemma4:13b' }`
- cpu-only, 8GB, 4 cores → `{ threads: 4, memoryLimit: 4, model: 'gemma2:2b' }`
