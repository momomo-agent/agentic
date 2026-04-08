# M57: Server Layer — hub.js + brain.js + api.js + profiles.js

## Goals
- Implement all missing server modules and detector profiles per architecture spec

## Acceptance Criteria
- src/server/hub.js: device registration, 60s heartbeat, wakeword broadcast, speak/display commands
- src/server/brain.js: LLM inference + tool_use response with text field
- src/server/api.js: /api/status, /api/config (persistent), /api/speak, /api/devices
- src/detector/profiles.js: getProfile(hardware) returns hardware profile
- profiles/default.json: CPU-only fallback profile

## Tasks
- task-1775525627764: src/server/hub.js (P0)
- task-1775525627797: src/server/brain.js (P0)
- task-1775525627832: src/server/api.js (P0)
- task-1775525627873: src/detector/profiles.js + profiles/default.json (P0)
