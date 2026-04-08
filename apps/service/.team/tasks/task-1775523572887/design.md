# User README Documentation — Technical Design

## Files to Create/Modify
- `README.md` — root-level user documentation

## Structure
```
# agentic-service
One-line description.

## Install
npx / global / Docker commands

## First Run
What happens on first launch (hardware detect → profile → Ollama → browser)

## Usage
- Chat UI at http://localhost:3000
- Admin panel at http://localhost:3000/admin

## Config
PUT /api/config fields (wakeWord, profile overrides)

## API Reference
POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status

## Requirements
Node 18+, macOS/Linux/Windows
```

## Approach
- Read existing `profiles/default.json` and `src/server/api.js` to extract accurate API docs
- Read `bin/agentic-service.js` for CLI flags
- No code changes — documentation only

## Edge Cases
- Docker section must note port mapping `-p 3000:3000`
- HTTPS/LAN section: mention self-signed cert warning in browser

## Test Cases
- All install commands copy-pasteable and correct
- API examples match actual endpoint signatures
