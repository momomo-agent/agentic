# M48: Docker + Test Coverage + SIGINT + setup.sh + Ollama Fallback

## Goals
- Verify Docker build and docker-compose end-to-end
- Enforce test coverage >=98% threshold
- Implement SIGINT graceful drain for in-flight requests
- Fix setup.sh Node.js detection and idempotency
- Fix Ollama non-200 fallback bug

## Acceptance Criteria
- `docker-compose up` starts all services cleanly
- Test suite reports >=98% coverage
- SIGINT during active requests drains gracefully before exit
- setup.sh is idempotent and detects existing Node.js
- Ollama non-200 responses fall back correctly without crash

## Tasks
- task-1775524071620: Docker build + docker-compose end-to-end verification (P1)
- task-1775524078711: Test coverage >=98% threshold enforcement (P1)
- task-1775524084592: SIGINT graceful drain during in-flight requests (P1)
- task-1775524084623: setup.sh Node.js detection and idempotency (P1)
- task-1775524084653: Ollama non-200 fallback bug fix (P0)
