# Task Design: Fix root Dockerfile EXPOSE 3000→1234

**Task ID:** task-1775847821745
**Module:** Server（HTTP/WebSocket） — ARCHITECTURE.md §3
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

One-line change:

```diff
- EXPOSE 3000
+ EXPOSE 1234
```

## Verification

- `grep EXPOSE Dockerfile` → should show `EXPOSE 1234`
- `grep EXPOSE install/Dockerfile` → already `EXPOSE 1234` (no change)
- `grep -r '1234:1234' docker-compose.yml` → confirms port mapping matches

## Test Cases

- Existing Docker tests (if any) should still pass
- No new tests needed — this is a metadata-only fix (EXPOSE is documentation, not binding)

## ⚠️ Unverified Assumptions

None — all paths and values verified from source.
