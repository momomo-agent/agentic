# M55: Core Server Layer — hub.js + brain.js + api.js + profiles.js

## Goals
- Implement all missing server and detector modules per architecture spec

## Acceptance Criteria
- `src/server/hub.js`: device registration, discovery, multi-device coordination
- `src/server/brain.js`: LLM inference + tool calling, integrates with runtime/llm.js
- `src/server/api.js`: REST endpoints — POST /api/chat, /api/transcribe, /api/synthesize, GET /api/status, /api/config
- `src/detector/profiles.js`: getProfile(hardware) returns recommended model/config profile

## Tasks
- task-1775525108725: src/server/hub.js — device management (P0)
- task-1775525116359: src/server/brain.js — LLM inference + tool calling (P0)
- task-1775525116392: src/server/api.js — REST API endpoints (P0)
- task-1775525116426: src/detector/profiles.js — getProfile(hardware) (P0)
- task-1775525410073: profiles/default.json — built-in default hardware profile (P0)
