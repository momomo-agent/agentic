# M68 DBB — Docker, SIGINT, Coverage, CDN Cache, Setup

## Verification Criteria

### Docker
- [ ] `docker build -f install/Dockerfile .` exits 0
- [ ] `docker-compose -f install/docker-compose.yml up -d` starts container
- [ ] `curl http://localhost:3000/api/status` returns 200 JSON

### setup.sh
- [ ] Running setup.sh twice does not reinstall Node or agentic-service
- [ ] On macOS with Node >=18 already present, script skips install and runs server
- [ ] On Linux with Node <18, script installs Node 18 via nvm or nodesource

### Test Coverage
- [ ] `npm test -- --coverage` passes with coverage >=98%
- [ ] CI fails if coverage drops below 98%

### SIGINT Graceful Drain
- [ ] Sending SIGINT while SSE request is in-flight: server waits for drain before exit
- [ ] `waitDrain()` resolves within 10s timeout
- [ ] Process exits with code 0 after drain

### CDN Cache Staleness
- [ ] profiles.json cache older than 7 days triggers remote fetch on next startup
- [ ] Fresh cache (< 7 days) skips remote fetch
- [ ] `timestamp` field written to cache file on every remote fetch

### Architecture Audit
- [ ] src/cli/, src/server/cert.js, httpsServer.js, middleware.js either documented in ARCHITECTURE.md or CR submitted
