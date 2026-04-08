# Design: Fix optimizer.js hardware-adaptive config output (m77)

## File
- `src/detector/optimizer.js`

## Signature
```js
export function optimize({ gpu, memory, cpu })
  → { threads: number, memoryLimit: number, model: string, quantization: string }
```

## Logic (already implemented — verify no ollama setup code present)
- `apple-silicon`: threads=8, memoryLimit=floor(memory*0.75), model=gemma4:26b, q8
- `nvidia`: threads=4, memoryLimit=floor((gpu.vram??memory*0.5)*0.8), model=gemma4:13b, q4
- fallback (cpu-only/none): threads=cpu.cores??2, memoryLimit=floor(memory*0.5), model=gemma2:2b, q4

## Test cases
- `optimize({gpu:{type:'none'},memory:8,cpu:{cores:4}})` → `{threads:4,memoryLimit:4,model:'gemma2:2b',quantization:'q4'}`
