# M49: Server Layer + Profiles (P0 Architecture Gaps)

## Goals
Implement missing P0 server-layer modules and detector profiles per ARCHITECTURE.md.

## Scope
- src/server/hub.js — device management
- src/server/brain.js — LLM inference + tool calling
- src/server/api.js — REST API endpoints
- src/detector/profiles.js — getProfile(hardware)
- profiles/default.json — built-in default hardware profile

## Acceptance Criteria
- hub.js manages device connections and state
- brain.js handles LLM inference with tool calling support
- api.js exposes REST endpoints matching architecture spec
- profiles.js getProfile(hardware) returns correct profile
- profiles/default.json present with valid default config

## Blocked By
- M48 must complete first
