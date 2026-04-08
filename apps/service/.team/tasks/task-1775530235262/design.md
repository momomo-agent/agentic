# Design: Fix package.json imports map — add agentic-sense entry

## Analysis

`package.json` already has `"agentic-sense": "./src/runtime/adapters/sense.js"` in the `imports` field. The entry exists and points to the correct adapter.

This task is **verification only** — confirm the import resolves at runtime and the adapter file exists.

## Files

- `package.json` — `imports["agentic-sense"]` already set to `"./src/runtime/adapters/sense.js"`
- `src/runtime/adapters/sense.js` — adapter wrapping `agentic-sense` package

## Verification Steps

1. Confirm `package.json` imports field contains `"agentic-sense"` key
2. Confirm `src/runtime/adapters/sense.js` exists and exports `createPipeline`
3. Run: `node -e "import('#agentic-sense').then(m => console.log(Object.keys(m)))"` — should print exported keys without error

## Edge Cases

- If `agentic-sense` npm package is not installed, adapter catches errors and returns empty detection result (already implemented in adapter)
