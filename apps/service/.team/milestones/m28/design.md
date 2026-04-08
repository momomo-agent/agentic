# M28 Technical Design

## Goal
VAD integration in Web UI, HTTPS/LAN access, CDN 7-day cache refresh, Docker e2e validation, setup.sh idempotency.

## Task Order
1. task-1775515078705 — VAD in Web UI (independent)
2. task-1775515085075 — HTTPS + HTTP redirect (uses existing httpsServer.js)
3. task-1775515085107 — CDN 7-day cache refresh in profiles.js (independent)
4. task-1775515085136 — Docker e2e + setup.sh idempotency (validation only)

## Key Files
- `src/ui/client/` — VAD integration
- `src/server/httpsServer.js` — HTTPS server (exists)
- `src/server/cert.js` — self-signed cert (exists)
- `src/detector/profiles.js` — cache logic (exists, add expiry check)
- `install/Dockerfile` — Docker build
- `install/setup.sh` — install script
