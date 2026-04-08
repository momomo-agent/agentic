# M90 Technical Design — Wake Word, Cloud Fallback, LAN Tunnel, npx Startup

## Scope
Four verification tasks covering gaps in the vision: server-side wake word pipeline, cloud LLM fallback, LAN tunnel + HTTPS cert, and npx one-command startup.

## Files Touched
- `src/runtime/sense.js` — add `startWakeWordPipeline()`
- `src/tunnel.js` — refactor to export `startTunnel(port)`
- `src/server/cert.js` — already implemented, verify only
- `bin/agentic-service.js` — verify shebang + bin field
- `src/runtime/llm.js` — already implemented, verify fallback path

## Approach
Each task is a targeted fix or verification — no new abstractions needed.
