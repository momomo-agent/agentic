# Design: README.md 补全

## File to Modify
- `README.md` — add missing sections

## Current State
README already has: npx, global install, Docker commands, quick start, env vars.

## Missing Sections (DBB-013 to DBB-015)

### 1. Installation — verify all 3 methods documented
- `npx agentic-service` ✓ (exists)
- `npm i -g agentic-service` ✓ (exists)
- `docker run -p 3000:3000 momomo/agentic-service` ✓ (exists)

### 2. REST API Documentation (DBB-015) — ADD this section
```markdown
## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat | Stream LLM response |
| POST | /api/transcribe | Speech to text |
| POST | /api/synthesize | Text to speech |
| GET | /api/status | Hardware + profile info |
| GET | /api/config | Current config |
| PUT | /api/config | Update config |

### POST /api/chat
Request: `{ "message": "hello", "history": [] }`
Response: NDJSON stream `{ "type": "content", "content": "...", "done": false }`

### POST /api/transcribe
Request: multipart/form-data with `audio` field
Response: `{ "text": "transcribed text" }`

### POST /api/synthesize
Request: `{ "text": "hello" }`
Response: audio/wav binary
```

## Algorithm
1. Read current README.md
2. Append API section after env vars table
3. No other changes needed

## Test Cases (DBB-013 to DBB-015)
- README contains `npx agentic-service`
- README contains `docker` command
- README contains `/api/chat` endpoint documentation
