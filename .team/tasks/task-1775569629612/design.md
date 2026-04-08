# Design: Wire agentic-sense as External Package

## Problem
`vitest.config.js` has an alias `'#agentic-sense'` → `./src/runtime/adapters/sense.js` that bypasses the real package. `src/runtime/adapters/sense.js` already imports from `'agentic-sense'` directly — no source change needed there.

## Change Required

**File:** `vitest.config.js`

Remove the alias entry:
```js
'#agentic-sense': path.resolve('./src/runtime/adapters/sense.js'),
```

## Verification
- `vitest.config.js` contains no `#agentic-sense` reference
- `npm test` passes

## Edge Cases
- If other test files import `#agentic-sense` directly, update them to import from `'agentic-sense'`
- `package.json` already has `"agentic-sense": "file:./vendor/agentic-sense.tgz"` — no change needed
