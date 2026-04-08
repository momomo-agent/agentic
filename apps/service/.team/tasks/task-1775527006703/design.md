# Design: agentic-sense package verification — runtime/sense.js

## Problem
`agentic-sense` is not in `package.json` dependencies. `sense.js` imports `createPipeline` from `agentic-sense`. Without the package, `init()` and `initHeadless()` will throw.

## Approach
1. Check if `agentic-sense` exists on npm
2. If yes: add to `package.json` dependencies
3. If no: add `agentic-sense` to `package.json` `imports` map pointing to a local stub at `src/runtime/adapters/sense/index.js`

## Files to Modify
- `package.json` — add `agentic-sense` to `dependencies` OR add to `imports` map
- `src/runtime/adapters/sense/index.js` — local stub (only if package not on npm)

## Interface Contract
`sense.js` calls:
```js
createPipeline({ face: boolean, gesture: boolean, object: boolean })
  → Promise<{ detect(frame) → { faces, gestures, objects } }>
```

## Local Stub (if needed)
```js
// src/runtime/adapters/sense/index.js
export async function createPipeline(options) {
  return {
    detect(_frame) {
      return { faces: [], gestures: [], objects: [] };
    }
  };
}
```

## package.json imports entry (if local stub)
```json
"imports": {
  "agentic-sense": "./src/runtime/adapters/sense/index.js"
}
```

## Edge Cases
- `sense.js` `detect()` already guards `if (!pipeline)` — stub must not throw on `detect()`
- `startWakeWordPipeline` does not use `agentic-sense` — unaffected

## Test Cases
1. `import { createPipeline } from 'agentic-sense'` resolves without error
2. `initHeadless()` resolves without throwing
3. `detectFrame(null)` returns `{ faces: [], gestures: [], objects: [] }`
