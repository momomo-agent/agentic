# M67 Technical Design — Docker + Graceful Shutdown + Setup

## Docker Verification
- File: `install/Dockerfile`, `install/docker-compose.yml`
- Verify `HEALTHCHECK` directive hits `GET /api/status`
- Confirm `CMD` starts `bin/agentic-service.js`
- No changes needed if build passes; fix any missing `COPY` or `RUN npm ci` issues

## SIGINT Graceful Drain
- File: `src/server/api.js` (or `bin/agentic-service.js`)
- Pattern:
  ```js
  const connections = new Set()
  server.on('connection', s => { connections.add(s); s.on('close', () => connections.delete(s)) })
  process.on('SIGINT', () => {
    server.close(() => process.exit(0))
    connections.forEach(s => s.end())
  })
  ```
- Test file: `test/sigint.test.js` — spawn server, open SSE, send SIGINT, assert clean exit

## setup.sh Node.js Detection
- File: `install/setup.sh`
- Check: `node --version` → parse major ≥ 18, else `echo "Node.js 18+ required" && exit 1`
- Idempotency: guard each install step with existence checks (`command -v`, `[ -d ]`)
