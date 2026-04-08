# optimizer.js — Full Optimization Logic

## Files to modify
- `src/detector/optimizer.js`

## Current state
File exists but contains only `setupOllama` logic (Ollama install/pull). Optimization logic is missing.

## Function signatures
```js
// src/detector/optimizer.js
export function optimize(hardware, profile) → ProfileConfig
// Adjusts profile based on actual hardware constraints
// Returns modified profile with quantization/model size tuned to available memory
```

## Algorithm
1. If `hardware.gpu.type === 'apple-silicon'` and `hardware.memory >= 32`: keep profile as-is
2. If `hardware.memory < 16`: downgrade `llm.model` to smaller variant (e.g. `gemma4:4b`), set `quantization: 'q4'`
3. If `hardware.gpu.type === 'none'`: set `llm.provider = 'fallback'` (cloud)
4. If `hardware.gpu.vram < 8` and gpu is nvidia/amd: downgrade quantization to `q4`
5. Return adjusted profile

## Dependencies
- Called from `src/detector/profiles.js` `getProfile()` after `matchProfile()`

## Edge cases
- `hardware.memory` undefined → treat as 8GB (conservative)
- Unknown GPU type → fallback to cloud

## Test cases
- 8GB RAM, no GPU → profile.llm.provider === 'fallback'
- 16GB Apple Silicon → profile unchanged
- 8GB NVIDIA, 6GB VRAM → quantization downgraded to q4
