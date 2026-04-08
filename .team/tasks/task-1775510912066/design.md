# Design: 修复 src/detector/optimizer.js

## Problem
`optimizer.js` currently contains Ollama install/setup logic (`setupOllama`).
ARCHITECTURE.md lists `optimizer.js` under `detector/` but does not define its interface.
The file is functional but misnamed relative to its actual responsibility.

## Decision
Keep `optimizer.js` as-is (it owns Ollama setup). No rename needed — ARCHITECTURE.md only lists the file path, not a specific interface contract for optimizer.

## Files
- `src/detector/optimizer.js` — verify exports `setupOllama(profile)`

## Function Signature
```js
// src/detector/optimizer.js
export async function setupOllama(profile: ProfileConfig): Promise<{
  installed: boolean,
  version: string | null,
  modelReady: boolean,
  modelName: string
}>
```

## Verification
```js
import { setupOllama } from './src/detector/optimizer.js';
assert(typeof setupOllama === 'function');
```

## Edge Cases
- Ollama not installed → attempts install, returns `{ installed: false }` if declined
- Model pull fails → returns `{ modelReady: false }`
- `win32` platform → prints download URL and exits
