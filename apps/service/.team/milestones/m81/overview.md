# M81: Vision Gaps — Voice Latency + npx + README

## Goals
Close remaining vision partial gaps: voice latency benchmark, npx entrypoint verification, README completion.

## Status
PLANNED - Will start after m74, m76, m77 complete.

## Scope
- Voice latency benchmark: enforce <2s STT+LLM+TTS end-to-end (Vision missing)
- npx agentic-service entrypoint verification (PRD partial)
- Complete README.md documentation (PRD partial)

## Acceptance Criteria
- Voice pipeline latency measured and enforced under 2s
- `npx agentic-service` starts without errors
- README covers all install methods, API, config, and hardware requirements
