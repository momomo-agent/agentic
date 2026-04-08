# M76: DBB Gaps — CPU Profile, VAD, Optimizer, LAN Tunnel

## Goals
Close remaining DBB partial gaps: cpu-only profile, server-side VAD, optimizer.js fix, LAN tunnel.

## Tasks
- task-1775530542647: Add cpu-only profile to profiles/default.json (P1)
- task-1775530548652: Implement server-side VAD silence suppression (P1)
- task-1775530556380: Fix optimizer.js hardware optimization logic (P1)
- task-1775530233859: LAN tunnel via ngrok or cloudflare (P2)
- task-1775532350028: Implement CDN profiles.json 7-day cache staleness refresh (P1)

## Acceptance Criteria
- profiles/default.json has cpu-only profile with model recommendations
- Server-side VAD drops silence frames before STT/LLM pipeline
- optimizer.js returns hardware-based model config (not ollama setup code)
- LAN tunnel enables remote access to local service

## Gaps Addressed
- DBB partial: profiles/default.json missing cpu-only profile
- DBB missing: server-side VAD silence suppression
- DBB missing: optimizer.js hardware optimization logic
- Vision partial: LAN tunnel (ngrok/cloudflare) not implemented
