# Design: Add README.md to project root

## File to create
- `README.md` (project root)

## Content structure
1. Title + one-line description
2. Quickstart: `npx agentic-service`
3. Docker: `docker run -p 3000:3000 momomo/agentic-service`
4. API endpoints table: POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status, GET/PUT /api/config

## Edge cases
- Keep it concise — no installation deep-dives
- API table must match ARCHITECTURE.md endpoints exactly

## Test cases to verify
- `ls README.md` — exists
- `grep 'npx agentic-service' README.md` — found
- `grep 'docker run' README.md` — found
- `grep '/api/chat' README.md` — found
