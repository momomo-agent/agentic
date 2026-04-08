# M65: DBB Compliance — Profiles + Docker + Setup

## Goals
- Add cpu-only hardware profile to profiles/default.json
- Implement CDN profiles.json 7-day cache staleness check in profiles.js
- Verify setup.sh Node.js detection and idempotency
- Verify Docker build + docker-compose end-to-end

## Acceptance Criteria
- profiles/default.json contains cpu-only profile entry
- profiles.js refreshes CDN cache after 7 days
- setup.sh detects existing Node.js and is safe to re-run
- `docker-compose up` builds and starts service successfully

## Tasks
- task-1775527447913: cpu-only profile — profiles/default.json
- task-1775527452588: CDN profiles 7-day cache staleness — profiles.js
- task-1775527456505: setup.sh Node.js detection and idempotency verification
- task-1775527463404: Docker end-to-end build verification
