# Design: Wire agentic-embed as external package dependency

## Status
Already implemented. Verification only needed.

## Files to verify
- `src/runtime/embed.js` — imports from `'agentic-embed'` (external package) ✓
- `package.json` — `"agentic-embed": "*"` in dependencies ✓
- `package.json` — `"#agentic-embed": "./src/runtime/adapters/embed.js"` import map (local override for dev/test)

## Verification steps
1. Confirm `src/runtime/embed.js` line 1: `import { embed as agenticEmbed } from 'agentic-embed'`
2. Confirm `package.json` dependencies includes `"agentic-embed": "*"`
3. Run `node -e "import('agentic-embed').then(m => console.log(typeof m.embed))"` — should print `function`

## Edge cases
- If `agentic-embed` is not installed, `npm install` resolves it via the `*` version range
- The `#agentic-embed` import map in package.json provides a local adapter fallback for test environments

## Test cases
- `embed('hello')` returns a non-empty array of numbers
- `embed('')` returns `[]`
- `embed(123)` throws `TypeError: text must be a string`
