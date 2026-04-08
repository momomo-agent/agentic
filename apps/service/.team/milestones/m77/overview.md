# M77: External Package Wiring — agentic-store, agentic-embed, agentic-voice, agentic-sense

## Goals
- Confirm/wire agentic-store as external package (replace local src/store/index.js stub)
- Confirm/wire agentic-embed as external package (replace local src/runtime/embed.js stub)
- Confirm agentic-voice wrapping in stt.js and tts.js
- Confirm agentic-sense wrapping in runtime/sense.js

## Acceptance Criteria
- src/store/index.js imports from agentic-store package (or CR submitted if package unavailable)
- src/runtime/embed.js imports from agentic-embed package (or CR submitted if package unavailable)
- runtime/stt.js and tts.js wrap agentic-voice package methods
- runtime/sense.js wraps agentic-sense (MediaPipe) package methods

## Gaps Addressed
- Architecture partial: agentic-store not confirmed as external package
- Architecture partial: agentic-embed not confirmed as external package
- Architecture partial: agentic-voice not confirmed as external package
- Architecture partial: agentic-sense not confirmed as external package
