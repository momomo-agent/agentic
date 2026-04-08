# M67: DBB Compliance — Docker + Graceful Shutdown + Setup

## Goals
Verify operational readiness: Docker build, graceful shutdown, and setup script correctness.

## Tasks
- Docker end-to-end build verification
- SIGINT graceful drain during in-flight requests
- setup.sh Node.js detection and idempotency

## Acceptance Criteria
- `docker-compose up` builds and all services reach healthy state
- SIGINT drains active connections before exit
- `setup.sh` detects Node.js correctly and is idempotent
