# M73 Technical Design — Docker, SIGINT, Coverage, Setup

## Docker (task-1775529070735)
Fix `install/Dockerfile` COPY order: copy source before `npm ci`, ensure `npm run build` succeeds.
Fix `install/docker-compose.yml` build context path to `..` (project root).

## SIGINT graceful drain (task-1775529080454)
Already implemented in `bin/agentic-service.js` via `startDrain()` + `waitDrain()`.
Verify `inflight` counter increments/decrements correctly in `src/server/api.js` around request handlers.

## Coverage threshold (task-1775529080487)
Add `vitest.config.js` with coverage thresholds. No new test files needed.

## setup.sh idempotency (task-1775529080520)
`install/setup.sh` already checks `command -v node`. Verify the global-install branch also guards with `npm list -g` check.
