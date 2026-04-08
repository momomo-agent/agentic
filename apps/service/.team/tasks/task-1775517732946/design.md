# Design: README.md

## File
`README.md` (project root)

## Structure
1. Title + one-line description
2. Install: npx / global / Docker
3. First-run flow (hardware detect → Ollama → browser)
4. REST API table: method, path, body, response
5. Config: `~/.agentic-service/config.json` fields
6. Requirements: Node 18+, macOS/Linux

## Test Cases
- File exists at project root
- Contains `npx agentic-service`
- Contains `docker run`
- Contains API endpoint table with /api/chat, /api/transcribe, /api/synthesize
