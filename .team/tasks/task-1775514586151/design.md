# Design: gpu-detector.js 合并到 hardware.js

## Files
- `src/detector/hardware.js` — inline all GPU detection logic, remove import of gpu-detector.js
- `src/detector/gpu-detector.js` — delete after merge

## Changes to hardware.js

Move all functions from gpu-detector.js directly into hardware.js:

```js
// Replace: import { detectGPU } from './gpu-detector.js';
// With: inline detectGPU, detectMacGPU, detectLinuxGPU, detectWindowsGPU, parseVRAM, parseWindowsVRAM
```

Function signatures (unchanged):
```js
async function detectGPU(platform: string): Promise<{type: string, vram: number}>
async function detectMacGPU(): Promise<{type: string, vram: number}>
async function detectLinuxGPU(): Promise<{type: string, vram: number}>
async function detectWindowsGPU(): Promise<{type: string, vram: number}>
function parseVRAM(output: string): number
function parseWindowsVRAM(output: string): number
```

## Algorithm
1. Copy all functions from gpu-detector.js into hardware.js (after existing imports)
2. Remove `import { detectGPU } from './gpu-detector.js'`
3. Delete src/detector/gpu-detector.js

## Edge Cases
- No other file imports gpu-detector.js directly (verify with grep before deleting)

## Test Cases (DBB-001, DBB-002)
- `detect()` returns `gpu.type` and `gpu.vram` fields
- No file in project imports gpu-detector.js
- gpu-detector.js does not exist
