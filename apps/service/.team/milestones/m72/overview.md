# M72: Voice Latency + npx Entrypoint + README + External Packages

## Goal
Close remaining vision and architecture partial gaps: voice latency enforcement, npx entrypoint, README completeness, and external package wiring.

## Tasks
- task-1775528530048: Voice latency <2s benchmark (P1)
- task-1775528544032: npx entrypoint verification (P1)
- task-1775528544066: README completeness (P1)
- task-1775528544100: agentic-sense and agentic-voice external package wiring (P1)

## Acceptance Criteria
- STT+LLM+TTS round-trip confirmed <2s
- `npx agentic-service` starts without errors
- README covers npx/Docker/global install + API endpoints
- runtime/sense.js imports from agentic-sense; runtime/stt.js+tts.js import from agentic-voice
