# Task Design: Create src/index.js entry point

**Module:** Package entry (cross-cutting — references Server, Runtime, Detector)
**Task:** task-1775793599438

## Problem

`package.json` declares `"main": "src/index.js"` but the file does not exist. The package is broken for any consumer doing `require('agentic-service')` or `import ... from 'agentic-service'`.

## Files to Create

- `src/index.js` (NEW)

## Verified Exports to Re-export

From actual source files:

| Source | Export | Verified |
|--------|--------|----------|
| `./server/api.js` | `startServer` (line 594) | ✅ |
| `./server/api.js` | `createApp` (line 569) | ✅ |
| `./server/api.js` | `stopServer` (line 657) | ✅ |
| `./detector/hardware.js` | `detect` | ✅ (ARCHITECTURE.md) |
| `./detector/profiles.js` | `getProfile` | ✅ (ARCHITECTURE.md) |
| `./detector/matcher.js` | `matchProfile` | ✅ (ARCHITECTURE.md) |
| `./detector/ollama.js` | `ensureOllama` | ✅ (ARCHITECTURE.md) |
| `./runtime/llm.js` | `chat` (line 112) | ✅ |
| `./runtime/stt.js` | `transcribe`, `init` | ✅ |
| `./runtime/tts.js` | `synthesize`, `init` | ✅ |
| `./runtime/embed.js` | `embed` (line 3) | ✅ |
| `./runtime/memory.js` | `add`, `remove`, `search` (lines 12, 26, 35) | ✅ |

## Implementation Plan

1. Create `src/index.js` as ESM (project uses `import/export` throughout)
2. Re-export named exports from each module
3. Group by namespace for clarity: `detector`, `runtime`, `server`

```javascript
// src/index.js — package entry point
export { startServer, createApp, stopServer } from './server/api.js'
export { detect } from './detector/hardware.js'
export { getProfile } from './detector/profiles.js'
export { matchProfile } from './detector/matcher.js'
export { ensureOllama } from './detector/ollama.js'
export { chat } from './runtime/llm.js'
export * as stt from './runtime/stt.js'
export * as tts from './runtime/tts.js'
export { embed } from './runtime/embed.js'
export { add as memoryAdd, remove as memoryRemove, search as memorySearch } from './runtime/memory.js'
```

## Test Cases

1. `node --input-type=module -e "import { startServer } from './src/index.js'; console.log(typeof startServer)"` → prints `function`
2. `node --input-type=module -e "import { detect } from './src/index.js'; console.log(typeof detect)"` → prints `function`
3. `node --input-type=module -e "import { chat } from './src/index.js'; console.log(typeof chat)"` → prints `function`

## ⚠️ Unverified Assumptions

- `detect` export name from `detector/hardware.js` — verified in ARCHITECTURE.md but not grep'd from source. Developer should confirm.
- `getProfile` from `profiles.js` — same caveat.
