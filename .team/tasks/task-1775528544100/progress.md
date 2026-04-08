# agentic-sense and agentic-voice external package wiring

## Progress

- Created `src/runtime/adapters/sense.js` wrapping installed `agentic-sense` CJS package with `createPipeline` API
- Added `"agentic-sense"` entry to `package.json` imports map
- All `agentic-voice/*` imports already wired via imports map — confirmed correct
