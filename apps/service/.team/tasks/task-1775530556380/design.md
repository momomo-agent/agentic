# Design: Fix optimizer.js hardware-adaptive config output (m76)

## File
- `src/detector/optimizer.js`

## Current state
`optimize(hardware)` already returns `{ threads, memoryLimit, model, quantization }` for apple-silicon, nvidia, and cpu fallback. No ollama setup code present.

## Action
Verify the existing implementation satisfies the DBB. If any ollama setup code exists, remove it. Ensure the cpu-only fallback branch uses `cpu.cores` for threads.

## Expected signature
```js
export function optimize(hardware: { gpu: { type: string, vram?: number }, memory: number, cpu: { cores: number } })
  → { threads: number, memoryLimit: number, model: string, quantization: string }
```

## Test cases
- `optimize({ gpu:{type:'apple-silicon'}, memory:16, cpu:{cores:8} })` → `{ threads:8, memoryLimit:12, model:'gemma4:26b', quantization:'q8' }`
- `optimize({ gpu:{type:'nvidia',vram:8}, memory:16, cpu:{cores:4} })` → `{ threads:4, memoryLimit:6, model:'gemma4:13b', quantization:'q4' }`
- `optimize({ gpu:{type:'none'}, memory:8, cpu:{cores:4} })` → `{ threads:4, memoryLimit:4, model:'gemma2:2b', quantization:'q4' }`
