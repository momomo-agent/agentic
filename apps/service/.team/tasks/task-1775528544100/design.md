# Design: agentic-sense and agentic-voice external package wiring

## Files
- `src/runtime/sense.js` — imports `createPipeline` from `agentic-sense`
- `src/runtime/stt.js` — imports adapters from `agentic-voice/*`
- `src/runtime/tts.js` — imports adapters from `agentic-voice/*`
- `package.json` — `imports` map provides `agentic-sense` and `agentic-voice/*` aliases

## Status
Already wired. Verify `imports` map in `package.json` includes `agentic-sense` key pointing to local adapter.

## Test cases
- `import { createPipeline } from 'agentic-sense'` resolves without error
- `import('agentic-voice/sensevoice')` resolves to local adapter
