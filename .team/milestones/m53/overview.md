# M53: Core Server Layer — hub.js + brain.js + api.js + profiles

## Goals
Implement server layer and detector profiles per ARCHITECTURE.md spec.

## Scope
- `src/server/hub.js` — device management
- `src/server/brain.js` — LLM inference + tool calling
- `src/server/api.js` — REST API endpoints
- `src/detector/profiles.js` — getProfile(hardware)
- `profiles/default.json` — built-in default hardware profile

## Acceptance Criteria
- All REST endpoints functional: POST /api/chat, /api/transcribe, /api/synthesize, GET /api/status, /api/config, PUT /api/config
- hub.js manages device registry
- profiles.js returns correct profile for detected hardware
- profiles/default.json present with valid schema
