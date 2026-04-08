# M73: DBB Compliance — Docker, SIGINT, Coverage, Setup

## Goals
Close remaining partial DBB gaps: Docker end-to-end, SIGINT graceful drain, test coverage threshold, setup.sh idempotency.

## Tasks
- task-1775529070735: Docker build and docker-compose end-to-end verification (P1)
- task-1775529080454: SIGINT graceful drain during in-flight requests (P1)
- task-1775529080487: Test coverage >=98% threshold enforcement (P1)
- task-1775529080520: setup.sh Node.js detection and idempotency (P1)

## Acceptance Criteria
- docker build succeeds and docker-compose up starts service on port 3000
- SIGINT during active request completes the request before exit
- vitest --coverage fails when coverage < 98%
- setup.sh re-run on existing install produces no errors or duplicate side effects
