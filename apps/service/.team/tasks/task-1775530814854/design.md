# Design: Confirm agentic-voice wrapping in stt.js and tts.js

## Files
- `src/runtime/stt.js`
- `src/runtime/tts.js`

## Approach
1. Read both files and check if they import from `agentic-voice`
2. If local stubs: replace with imports from `agentic-voice` package
3. If package unavailable in node_modules: submit CR to architecture

## Acceptance Criteria
- Both `stt.js` and `tts.js` delegate to `agentic-voice` package methods
- OR a CR is filed if package is unavailable
