# Test Result: Wire agentic-embed as external package dependency

## Status: PASSED

## Tests Run: 5 passed, 0 failed

### Results
- ✓ package.json has agentic-embed in dependencies
- ✓ package.json has #agentic-embed import map pointing to local adapter
- ✓ src/runtime/embed.js imports from agentic-embed (not local path)
- ✓ embed.js exports embed function with correct guards (TypeError, empty string)
- ✓ agentic-embed resolves as a module with embed export

### Test file
`test/m76-embed-wiring.test.js`

## Edge Cases
- Local adapter (`#agentic-embed`) throws "not implemented" — expected for dev/test environment
- Real package resolves via `*` version range in dependencies
