# M66: DBB Compliance — Profiles, Cache, Setup, Docker

## Goals
- cpu-only hardware profile in profiles/default.json
- 7-day CDN cache staleness refresh in detector/profiles.js
- setup.sh Node.js detection + idempotency
- Docker end-to-end build verification

## Acceptance Criteria
- profiles/default.json includes cpu-only entry alongside apple-silicon and nvidia
- profiles.js refreshes cached CDN data after 7 days
- setup.sh re-run is safe and detects existing Node.js correctly
- docker-compose up builds and all services start healthy
