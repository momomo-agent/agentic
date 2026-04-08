# M68 Technical Design

## Scope
Fix Docker build, setup.sh idempotency, test coverage threshold, SIGINT drain, CDN cache staleness, and architecture audit for unspecified server files.

## Files Touched
- `install/Dockerfile` — verify build order (build UI before prune)
- `install/setup.sh` — idempotency guards already present; verify Node version check
- `vitest.config.js` — add coverage threshold
- `bin/agentic-service.js` — SIGINT handler calls startDrain + waitDrain
- `src/detector/profiles.js` — 7-day staleness already implemented; verify timestamp write
- `src/server/cert.js`, `src/server/httpsServer.js`, `src/server/middleware.js` — submit CR to add to ARCHITECTURE.md
- `src/cli/` — submit CR to document in ARCHITECTURE.md
