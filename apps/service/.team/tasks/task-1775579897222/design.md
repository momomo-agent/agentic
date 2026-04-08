# Design: Verify agentic-sense Wiring

## Checks to perform

1. `grep -r '#agentic-sense' src/` — must return zero matches
2. `node -e "require('./src/runtime/sense.js')"` — must exit 0
3. Inspect `src/adapters/sense.js` — confirm named imports match exports from `agentic-sense` package
4. Inspect `package.json` — confirm `agentic-sense` is listed as a dependency (not import map)

## Pass criteria
All 4 checks pass with no errors.

## Fail path
If any check fails, create a blocking note and escalate to developer (task-1775573229039 incomplete).
