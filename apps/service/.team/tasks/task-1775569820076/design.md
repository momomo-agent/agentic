# Design: Fix createPipeline export in src/runtime/adapters/sense.js

## Problem
`src/runtime/adapters/sense.js` exports `createPipeline` as a named re-export, but `src/runtime/sense.js` imports it via `import { createPipeline } from 'agentic-sense'` directly (not via the adapter). Tests mock `agentic-sense` and expect `createPipeline` to be importable from the adapter module.

## File to Modify
- `src/runtime/adapters/sense.js`

## Current State
```js
import { createPipeline as _createPipeline } from 'agentic-sense';
export async function createPipeline(options = {}) {
  return _createPipeline(options);
}
```

## Fix
The adapter already exports `createPipeline` correctly. The issue is that `src/runtime/sense.js` bypasses the adapter and imports directly from `agentic-sense`. Update `sense.js` to import `createPipeline` from the adapter instead.

## Files to Modify
- `src/runtime/sense.js` — change import source from `'agentic-sense'` to `'./adapters/sense.js'`

## Function Signatures
```js
// src/runtime/adapters/sense.js (no change needed)
export async function createPipeline(options?: object): Promise<Pipeline>
```

## Logic
1. In `src/runtime/sense.js`, locate the import of `createPipeline`
2. Change `from 'agentic-sense'` → `from './adapters/sense.js'`
3. No other changes needed

## Edge Cases
- If `sense.js` imports other things from `agentic-sense` directly, keep those; only redirect `createPipeline`

## Test Cases
- `test/runtime/sense-pipeline.test.js` — mocks `agentic-sense`, expects `createPipeline` to be called through the adapter chain
- `test/runtime/sense-dbb001.test.js` — verifies pipeline initializes correctly
