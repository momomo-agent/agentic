# Design: Verify npx agentic-service One-Command Startup

## Files to Verify
- `package.json` — `bin` field must point to `bin/agentic-service.js`
- `bin/agentic-service.js` — shebang `#!/usr/bin/env node` on line 1

## Checks
1. `package.json` has `"bin": { "agentic-service": "bin/agentic-service.js" }`
2. `bin/agentic-service.js` starts with `#!/usr/bin/env node`
3. File is executable (`chmod +x` or `package.json` sets it)
4. `startServer(port)` in `src/server/api.js` resolves without error on clean run
5. `GET /api/status` returns 200 after startup

## Fix If Needed
- If `bin` field missing: add to `package.json`
- If shebang missing: add as first line of `bin/agentic-service.js`
- If import errors on startup: trace through `bin/agentic-service.js` → `src/cli/setup.js` → `src/server/api.js`

## Test Cases
- Spawn `node bin/agentic-service.js --skip-setup` → process starts, port bound
- `GET http://localhost:<port>/api/status` → `{ hardware, profile, devices }` JSON response
- SIGINT → process exits cleanly (no hanging handles)
