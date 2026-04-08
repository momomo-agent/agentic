# M82: DBB Compliance — Optimizer, VAD, Coverage, Setup, CDN Cache

## Goals
Close remaining DBB gaps cancelled in prior milestones.

## Scope
- Fix optimizer.js hardware-adaptive config (DBB: missing, P0)
- Server-side VAD silence suppression (DBB: missing, P0)
- vitest coverage threshold >=98% (DBB: partial, P0)
- setup.sh Node.js detection + idempotency (DBB: partial, P1)
- CDN profiles.json 7-day cache staleness check (DBB: partial, P1)

## Acceptance Criteria
- optimizer.js returns adaptive config based on GPU/CPU/memory
- VAD filters silence before STT pipeline
- vitest --coverage fails below 98%
- setup.sh is idempotent and skips existing Node.js
- profiles.js refreshes CDN cache after 7 days
