# M79: CDN Staleness + LAN Tunnel + VAD + Optimizer + External Packages

## Goals
- Implement CDN profiles.json 7-day cache staleness refresh
- Implement LAN tunnel via ngrok or cloudflare
- Add cpu-only profile to profiles/default.json
- Implement server-side VAD silence suppression
- Fix optimizer.js hardware-adaptive config output
- Wire agentic-store, agentic-embed, agentic-voice, agentic-sense as external packages

## Acceptance Criteria
- CDN profiles.json refreshes if cache is >7 days old
- LAN tunnel exposes local server over public URL
- profiles/default.json includes cpu-only profile entry
- Server-side VAD suppresses silence before sending to STT
- optimizer.js outputs valid hardware-adaptive config (no ollama setup code)
- agentic-store replaces src/store/index.js
- agentic-embed replaces src/runtime/embed.js
- agentic-voice confirmed wrapping stt.js and tts.js
- agentic-sense confirmed wrapping runtime/sense.js

## Gaps Addressed
- architecture: partial — agentic-store, agentic-embed, agentic-voice, agentic-sense
- dbb: partial — cpu-only profile, CDN staleness
- vision: partial — LAN tunnel, server-side VAD
