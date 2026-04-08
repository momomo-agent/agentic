# Design: Wire agentic-sense as external package

## Files to modify
- `package.json` — add `"agentic-sense"` to dependencies
- `src/runtime/sense.js` — change import from `'#agentic-sense'` to `'agentic-sense'`

## Steps
1. Add `"agentic-sense": "*"` to `package.json` dependencies
2. In `src/runtime/sense.js` line 1, replace:
   ```js
   import { createPipeline } from '#agentic-sense';
   ```
   with:
   ```js
   import { createPipeline } from 'agentic-sense';
   ```
3. Remove any `imports` field entry for `#agentic-sense` from `package.json` if present

## Edge cases
- `#agentic-sense` is a Node.js import map alias — removing it requires no other changes if the external package exports `createPipeline` at its root

## Test cases
- `init(videoElement)` resolves without throwing when package is installed
- `createPipeline` is callable and returns an object with a `detect` method
