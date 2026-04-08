# M59: Server Layer — hub.js + brain.js + api.js + profiles.js

## Goals
- Implement all missing server modules and detector profiles per architecture spec

## Acceptance Criteria
- src/server/hub.js: device registration, heartbeat, brain state sync
- src/server/brain.js: LLM inference + tool calling orchestration
- src/server/api.js: /chat, /status, /devices REST endpoints
- src/detector/profiles.js: getProfile(hardware) implemented
- profiles/default.json: built-in default hardware profile present

## Tasks
- task-1775525739268: src/server/hub.js (P0)
- task-1775525745181: src/server/brain.js (P0)
- task-1775525745223: src/server/api.js (P0)
- task-1775525750474: src/detector/profiles.js + profiles/default.json (P0)
