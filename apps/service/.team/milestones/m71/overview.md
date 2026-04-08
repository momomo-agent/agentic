# M71: Server-Side VAD Silence Suppression

## Goal
Implement server-side voice activity detection to prevent silence audio from reaching the STT/LLM pipeline.

## Tasks
- task-1775528326243: Server-side VAD silence suppression (P0 — missing gap)

## Acceptance Criteria
- Server filters silent audio frames before forwarding to STT
- No silent audio reaches the LLM pipeline
