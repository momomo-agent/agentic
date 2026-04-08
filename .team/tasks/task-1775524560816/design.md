# gpu-detector.js — Merge into hardware.js

## Files to modify
- `src/detector/hardware.js` — absorb any gpu-detector.js logic not already present

## Files to delete
- `src/detector/gpu-detector.js` — remove after merge (if it exists)

## Algorithm
1. Check if `src/detector/gpu-detector.js` exists
2. If yes: compare its exported functions with `hardware.js` `detectGPU()` internals
3. Copy any missing GPU detection logic into `hardware.js` `detectGPU()` or its platform sub-functions
4. Update any imports of `gpu-detector.js` to use `hardware.js` instead
5. Delete `gpu-detector.js`

## Current state
`hardware.js` already has `detectGPU(platform)` with `detectMacGPU`, `detectLinuxGPU`, `detectWindowsGPU`. Likely no additional logic needed — just verify and delete the stale file.

## Edge cases
- If `gpu-detector.js` doesn't exist: task is a no-op, mark done
- If other files import `gpu-detector.js`: update those imports

## Test cases
- `detect()` still returns correct GPU info after merge
- No import errors after deletion
