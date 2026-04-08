# Design: Wire agentic-sense as external npm package

## Context
- `src/runtime/adapters/sense.js` already imports from `agentic-sense` directly
- `package.json` has `agentic-sense` in `dependencies` as `"file:./vendor/agentic-sense.tgz"`
- Need to verify the import map alias `#agentic-sense` is not used anywhere

## Files
- **modify** `package.json` — confirm `dependencies` has `"agentic-sense": "file:./vendor/agentic-sense.tgz"`
- **remove** `#agentic-sense` from `imports` map in `package.json` if present

## Verification Steps
1. `grep -r '#agentic-sense' src/` — should return nothing
2. `node -e "import('agentic-sense')"` — should resolve without error
3. `node -e "import('./src/runtime/sense.js')"` — should load cleanly

## Edge Cases
- If `vendor/agentic-sense.tgz` does not exist, task is blocked — escalate
- Do not change `src/runtime/sense.js` or `src/runtime/adapters/sense.js` unless import fails
