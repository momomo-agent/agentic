# Docker build and docker-compose end-to-end verification

## Progress

- Added `GET /health` endpoint to `src/server/api.js`
- Created `Dockerfile` (node:20-slim, --skip-setup flag)
- Created `docker-compose.yml` with healthcheck on `/health`

## Fixes Applied

- Added `COPY vendor ./vendor` to Dockerfile before `npm ci`
- Created stub vendor tarballs (agentic-sense, agentic-store, agentic-embed, agentic-voice)
- Updated package-lock.json integrity hashes for vendor tarballs
- Fixed `src/runtime/sense.js`: check `arecord` availability before starting mic to prevent unhandled spawn error crash in Docker

## Verification

- `docker build` exits 0
- `docker-compose up -d` starts container
- `curl http://localhost:3000/health` returns HTTP 200
