# M68: DBB Compliance — Docker, SIGINT, Coverage, CDN Cache, Setup

## Goals
Close remaining DBB partial gaps not covered by m61–m64.

## Tasks
- Docker build and docker-compose end-to-end verification
- Test coverage >=98% threshold enforcement
- SIGINT graceful drain during in-flight requests
- CDN profiles.json cache staleness check (7-day refresh)
- setup.sh Node.js detection and idempotency

## Acceptance Criteria
- `docker build` and `docker-compose up` succeed without errors
- vitest coverage threshold set to 98%; CI fails below threshold
- SIGINT drains active SSE/WebSocket connections before exit
- CDN profiles.json refreshed if >7 days stale
- setup.sh detects Node.js version correctly and is idempotent
- src/cli/ and unspecified server files documented in ARCHITECTURE.md (via CR) or removed
