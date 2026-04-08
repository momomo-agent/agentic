# M62: DBB Compliance — Server VAD + optimizer.js + agentic-voice

## Goals
- Implement server-side VAD silence suppression
- Fix optimizer.js to output hardware-adaptive config
- Integrate agentic-voice package so stt.js + tts.js work correctly

## Acceptance Criteria
- Server-side VAD filters silence before STT/LLM pipeline
- optimizer.js returns hardware-adaptive config (threads, memory, model)
- agentic-voice in package.json dependencies; stt.js + tts.js use it

## Tasks
- task-1775526816885: Server-side VAD silence suppression (P0)
- task-1775526823938: optimizer.js hardware-adaptive config output (P0)
- task-1775526916299: agentic-voice package integration — stt.js + tts.js (P1)
