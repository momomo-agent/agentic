# M38: Server层实现 (hub/brain/api)

## Goals
Implement the 3 missing P0 server modules.

## Scope
- `src/server/hub.js` — device management, join/leave events, heartbeat
- `src/server/brain.js` — LLM inference + tool calling
- `src/server/api.js` — REST API: /api/status, /api/config, /api/devices

## Acceptance Criteria
- hub.js tracks connected devices, emits join/leave events
- brain.js routes to llm runtime, supports tool calling
- api.js exposes all required endpoints per ARCHITECTURE.md

## Dependencies
- Blocked by m37 (runtime layer must exist first)
- hub.js and brain.js must complete before api.js
