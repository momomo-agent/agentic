# M27: Runtime层补全续 + Server层核心 (stt/tts/sense/memory/hub/brain/api)

## Goals
- Implement remaining runtime modules: stt.js, tts.js, sense.js, memory.js
- Implement server layer: hub.js, brain.js, api.js
- Add profiles/default.json built-in hardware profile

## Acceptance Criteria
- src/runtime/stt.js: transcribe(audioBuffer) → text
- src/runtime/tts.js: synthesize(text) → audioBuffer
- src/runtime/sense.js: MediaPipe sense runtime
- src/runtime/memory.js: memory runtime
- src/server/hub.js: device management
- src/server/brain.js: LLM inference + tool calling
- src/server/api.js: REST API endpoints
- profiles/default.json: built-in default hardware profile

## Architecture Match Target
Raise architecture match from 18% toward 60%+
