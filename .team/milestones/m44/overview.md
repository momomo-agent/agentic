# M44: Ollama Auto-Install + npx Entrypoint + Multi-Device Brain State

## Goals
- Implement Ollama binary auto-install and recommended model pull with progress display
- Verify and fix npx entrypoint (npx agentic-service) for one-click startup
- Implement multi-device AI brain state sharing (cross-device context sync)

## Acceptance Criteria
- `setup.js` detects missing Ollama, downloads and installs binary, pulls recommended model with progress bar
- `npx agentic-service` works end-to-end on a fresh machine
- Brain state (conversation context, active profile) syncs across connected devices via hub.js

## Blocked By
- M43 must complete first (VAD, README, CDN endpoint, headless sense)
