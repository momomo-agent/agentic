# Task Design: Fix root Dockerfile EXPOSE 3000 → 1234

**Task ID:** task-1775847711853
**Module:** Server（HTTP/WebSocket） — see ARCHITECTURE.md §3
**Module Design:** `.team/designs/server.design.md`

## Problem

Root `Dockerfile` line 13 has `EXPOSE 3000` but the service defaults to port 1234:
- `bin/agentic-service.js` passes `--port 1234`
- `docker-compose.yml` maps `1234:1234`
- `install/Dockerfile` correctly uses `EXPOSE 1234`

## Files to Modify

| File | Change |
|------|--------|
| `Dockerfile` (root, line 13) | `EXPOSE 3000` → `EXPOSE 1234` |

## Implementation

Single-line change:

```diff
- EXPOSE 3000
+ EXPOSE 1234
```

No other files affected. No code logic changes.

## Verification

- DBB-003 in `.team/milestones/m98/dbb.md`: Docker port mapping shows 1234
- `grep EXPOSE Dockerfile` → should output `EXPOSE 1234`
- `grep EXPOSE install/Dockerfile` → already `EXPOSE 1234` (no change needed)

## Test Cases

1. `grep -n 'EXPOSE' Dockerfile` → line 13: `EXPOSE 1234`
2. Both Dockerfiles now agree on port 1234
3. `docker-compose config` shows port 1234 (already correct in docker-compose.yml)

## ⚠️ Unverified Assumptions

None — all paths and values verified from source.
