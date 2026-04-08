# Design: README Completeness Audit

## File
- `README.md` (update in-place)

## Required Sections

| Section | Content |
|---------|---------|
| Install | npx, global npm, Docker commands |
| Quick Start | `npx agentic-service`, open browser |
| Configuration | profiles.json location, env vars (OPENAI_API_KEY, PORT) |
| API Reference | POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status, GET/PUT /api/config |

## Audit Steps
1. Read current README.md
2. For each required section: if missing → append; if present but incomplete → update that section only
3. Do not rewrite sections that are already complete

## Edge Cases
- README missing entirely: create with all sections
- Sections present but under different headings: update existing heading content
