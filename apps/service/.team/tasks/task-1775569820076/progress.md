# Fix createPipeline export in src/runtime/adapters/sense.js

## Progress

- Replaced local `createPipeline` in `src/runtime/sense.js` with import from `./adapters/sense.js`
- Adapter already correctly re-exports from `agentic-sense`; tests mocking that package now intercept via adapter chain

## Fix Applied
- Rewrote `src/runtime/adapters/sense.js` to delegate `createPipeline` to `agentic-sense` instead of wrapping `AgenticSense` class
- 11/11 tests pass: sense-pipeline.test.js (6) + sense-dbb001.test.js (5)

