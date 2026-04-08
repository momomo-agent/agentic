# Task Design: README.md — 安装说明 + REST API文档

## File to Create
- `README.md` (project root)

## Sections Required

### 1. Install (3 methods)
- `npx agentic-service`
- `npm install -g agentic-service && agentic-service`
- `docker run -p 3000:3000 momomo/agentic-service`

### 2. REST API endpoints (from `src/server/api.js`)
| Method | Path | Request | Response |
|--------|------|---------|----------|
| POST | /api/chat | `{ message, history? }` | stream |
| POST | /api/transcribe | `{ audio }` | `{ text }` |
| POST | /api/synthesize | `{ text }` | audio buffer |
| GET | /api/status | — | `{ hardware, profile, devices }` |
| GET | /api/config | — | current config |
| PUT | /api/config | config object | updated config |

## No code changes needed — static markdown file only.

## Test Cases (DBB-010, DBB-011)
- `README.md` exists at project root
- Contains `npx agentic-service`, `npm install -g`, `docker` strings
- Contains `/api/chat`, `/api/transcribe`, `/api/synthesize` endpoint docs
