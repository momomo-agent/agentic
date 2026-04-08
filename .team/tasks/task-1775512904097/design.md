# Design: 编写 README.md

## Files
- `README.md` (new, project root)

## Structure
1. Title + one-line description
2. Install methods:
   - `npx agentic-service`
   - `npm i -g agentic-service && agentic-service`
   - `docker run -p 3000:3000 momomo/agentic-service`
3. First-run flow (7 steps from ARCHITECTURE.md)
4. API endpoints table:
   | Method | Path | Description |
   |--------|------|-------------|
   | POST | /api/chat | LLM chat (streaming) |
   | POST | /api/transcribe | STT |
   | POST | /api/synthesize | TTS |
   | GET | /api/status | hardware + profile + devices |
   | GET | /api/config | current config |
   | PUT | /api/config | update config |
5. UI routes: `/` (chat), `/admin` (admin panel)

## No code changes required — documentation only
