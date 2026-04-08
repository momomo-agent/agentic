# M50: Core Server — brain.js + api.js + hub.js + profiles

## Goals
Implement missing P0 server-layer modules per ARCHITECTURE.md.

## Scope
- src/server/brain.js — LLM inference + tool calling
- src/server/api.js — REST API endpoints
- src/server/hub.js — device management
- src/detector/profiles.js — getProfile(hardware)
- profiles/default.json — built-in default hardware profile

## Acceptance Criteria
- brain.js handles LLM inference with tool calling support
- api.js exposes REST endpoints matching architecture spec
- hub.js manages device connections and state
- profiles.js getProfile(hardware) returns correct profile
- profiles/default.json present with valid default config

## Blocked By
- M49 (Core Runtime) must complete first

## Tasks
- task-1775524204595: src/server/brain.js + api.js (P0)
- task-1775524204631: src/server/hub.js — device management (P0)
- task-1775524204665: src/detector/profiles.js + profiles/default.json (P0)
