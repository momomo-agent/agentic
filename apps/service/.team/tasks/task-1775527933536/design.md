# Design: src/cli/ and unspecified server files — document or submit CR

## Files to Audit
- `src/cli/setup.js` — first-run setup wizard
- `src/cli/browser.js` — open browser utility
- `src/server/cert.js` — self-signed cert generation
- `src/server/httpsServer.js` — HTTPS server factory
- `src/server/middleware.js` — error handler middleware

## Action
These files exist in the codebase but are not listed in ARCHITECTURE.md. Submit a CR to add them.

## CR Content
- `src/cli/` — CLI helpers (setup wizard, browser launcher) called from `bin/agentic-service.js`
- `src/server/cert.js` — `generateCert() → {key, cert}` using selfsigned
- `src/server/httpsServer.js` — `createServer(app) → https.Server`
- `src/server/middleware.js` — `errorHandler(err, req, res, next)` Express error middleware

## CR File
Write to `.team/change-requests/cr-1775527933536.json`

## Test Cases
- CR file exists with correct schema
- No source files modified
