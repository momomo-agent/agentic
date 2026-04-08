# M63 Technical Design — agentic-sense Package Verification

## Task
Ensure `agentic-sense` is a declared dependency and `src/runtime/sense.js` imports from it.

## Changes

### package.json
- Add `"agentic-sense": "*"` (or pinned version) under `dependencies`

### src/runtime/sense.js
- Already imports `from 'agentic-sense'` — no change needed if package is installed

## Steps
1. Check if `agentic-sense` exists on npm or as a local package
2. Add to `package.json` dependencies
3. Run `npm install` to verify resolution
4. Confirm `import { createPipeline } from 'agentic-sense'` resolves without error

## Edge Cases
- If `agentic-sense` is not published, add a local stub at `packages/agentic-sense/` and reference via `"agentic-sense": "file:./packages/agentic-sense"`
- Stub must export: `createPipeline({ face, gesture, object }) → { detect(frame), _video }`
