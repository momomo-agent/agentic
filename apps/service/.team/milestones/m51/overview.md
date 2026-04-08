# M51: Core Server Layer — hub.js + brain.js + api.js + profiles

## Goals
- Implement missing server-layer files per architecture spec
- Add profiles/default.json built-in hardware profile

## Acceptance Criteria
- hub.js: WebSocket device registration, heartbeat, sendCommand working
- brain.js: LLM inference + tool calling pipeline functional
- api.js: all REST endpoints respond correctly
- profiles.js: getProfile(hardware) returns correct profile
- profiles/default.json: built-in default profile present

## Tasks
- task-1775524672913: src/server/hub.js — device management (P0)
- task-1775524680027: src/server/brain.js — LLM inference + tool calling (P0, blocked by hub.js)
- task-1775524680061: src/server/api.js — REST API endpoints (P0, blocked by brain.js)
- task-1775524685959: src/detector/profiles.js + profiles/default.json (P0)
