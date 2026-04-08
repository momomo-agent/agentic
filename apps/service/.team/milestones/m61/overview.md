# M61: DBB Compliance — cpu-only Profile + CDN Staleness

## Goals
- Add missing cpu-only hardware profile to profiles/default.json
- Implement CDN 7-day cache staleness refresh for remote profiles

## Acceptance Criteria
- profiles/default.json contains cpu-only profile entry
- CDN fetch checks cache age and refreshes after 7 days

## Tasks
- task-1775526662402: cpu-only profile in profiles/default.json (P1)
- task-1775526709100: CDN profiles.json 7-day cache staleness check (P1)
