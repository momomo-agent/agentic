# M70: Vision Completeness — Voice Latency, npx Entrypoint, Sense/Voice Packages, README

## Goals
Close remaining vision and PRD partial gaps not covered by m68/m69.

## Tasks
- Voice latency <2s benchmark enforcement (STT+LLM+TTS pipeline)
- npx agentic-service entrypoint verification and fix
- agentic-sense and agentic-voice external package confirmation
- README completeness audit and update

## Acceptance Criteria
- Voice pipeline latency measured and enforced <=2000ms in test or CI
- `npx agentic-service` starts server without errors
- sense.js and stt.js/tts.js confirmed to wrap agentic-sense/agentic-voice packages
- README covers install, usage, config, and API endpoints
