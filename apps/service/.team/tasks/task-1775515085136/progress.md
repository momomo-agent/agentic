# Docker端到端验收 + setup.sh幂等性

## Progress

## Changes Made
1. `install/setup.sh` — added idempotency check: skips `npm install` if agentic-service already installed globally
2. `.dockerignore` — created to exclude `node_modules`, `.git`, `.team`, `*.log` from Docker COPY

## Docker Verification
- Dockerfile looks correct (node:20-alpine, npm ci --omit=dev, EXPOSE 3000)
- docker-compose.yml builds from parent dir, maps port 3000
- .dockerignore prevents COPY failures from large/irrelevant dirs

## Assumptions
- setup.sh is for local dev setup, not global npm install — idempotency check uses `npm list -g` as per design spec
