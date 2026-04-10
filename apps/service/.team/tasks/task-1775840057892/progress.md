# Remove dead import maps from package.json

## Progress

### Approach
Followed design.md Option A — remove only `#agentic-voice` (truly dead), keep `#agentic-embed` (used by tests).

### What was done
- Verified `#agentic-voice` has zero references in src/ or test/
- Verified `#agentic-embed` is actively used by `test/m76-embed-wiring.test.js` and `vitest.config.js`
- Removed `#agentic-voice` entry from `package.json` imports block
- All 845 tests pass (166 test files)
- Committed: `fix: remove dead #agentic-voice import map from package.json`
