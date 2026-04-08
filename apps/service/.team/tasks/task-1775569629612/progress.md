# Wire agentic-sense as external package

## Progress

- `vitest.config.js` and `package.json` already had no `#agentic-sense` alias
- Fixed `src/runtime/adapters/sense.js`: imports `AgenticSense` from `'agentic-sense'`, implements `createPipeline` wrapper
- Updated outdated tests (m86, integration/agentic-sense-wiring, m84) to match current design
- All 11 targeted tests pass
