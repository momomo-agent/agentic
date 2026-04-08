# Design: 用户文档 README (task-1775495680445)

## Files to Create/Modify
- `README.md` — create from scratch

## Sections Required

1. **Install** — three methods:
   - `npx agentic-service`
   - `npm i -g agentic-service && agentic-service`
   - `docker run -p 3000:3000 momomo/agentic-service`

2. **Quick Start** — first-run flow description (hardware detect → model pull → browser open)

3. **Environment Variables**
   - `OPENAI_API_KEY` — cloud fallback (OpenAI)
   - `ANTHROPIC_API_KEY` — cloud fallback (Anthropic)
   - `PORT` — default 3000

4. **API Reference** — all 6 endpoints with request/response examples:
   - `POST /api/chat` — SSE stream, body `{ message, history? }`
   - `POST /api/transcribe` — multipart audio, returns `{ text }`
   - `POST /api/synthesize` — body `{ text }`, returns audio buffer
   - `GET /api/status` — returns `{ hardware, profile, devices }`
   - `GET /api/config` — returns current config JSON
   - `PUT /api/config` — body is partial config, returns updated config

5. **Configuration** — `~/.agentic-service/config.json` schema

## No new source files needed — documentation only.

## Test Cases
- README.md exists and is valid Markdown
- All 3 install methods present
- All 6 API endpoints documented with examples
