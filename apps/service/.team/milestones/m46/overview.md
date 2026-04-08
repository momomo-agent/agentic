# M46: Core Server — brain.js + api.js + hub.js + profiles

## Goals
- Implement `src/server/brain.js` — LLM inference + tool calling
- Implement `src/server/api.js` — REST API endpoints
- Implement `src/server/hub.js` — device management
- Implement `src/detector/profiles.js` — getProfile(hardware)
- Add `profiles/default.json` — built-in default hardware profile

## Acceptance Criteria
- brain.js handles LLM inference requests and tool dispatch
- api.js exposes REST endpoints matching ARCHITECTURE.md spec
- hub.js manages connected device sessions
- profiles.js returns correct profile for detected hardware
- profiles/default.json exists with valid default config

## Blocked By
- M45 must complete first (llm.js, stt.js, tts.js, memory.js)
