# Task Design: README用户文档补全

## Files
- `README.md` — update with complete sections

## Required Sections
1. **Installation** — npx / global npm / Docker
2. **Quick Start** — one-liner to get running
3. **API Reference** — POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status, GET/PUT /api/config (each with request/response example)
4. **Docker** — `docker run -p 3000:3000 momomo/agentic-service`
5. **Configuration** — profile fields, env vars (PROFILES_URL, PORT)
6. **Troubleshooting** — Ollama not found, port in use, no mic

## Test
`test/m29-readme.test.js` reads README.md and checks all 6 headings exist.
