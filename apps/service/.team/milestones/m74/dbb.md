# M74 DBB — Docker, SIGINT, Coverage, Setup

## Verification Criteria

### 1. Docker Build & docker-compose
- [ ] `docker build -t agentic-service .` exits 0
- [ ] `docker-compose up` starts service; `curl http://localhost:3000/api/status` returns 200
- [ ] Container exposes port 3000

### 2. SIGINT Graceful Drain
- [ ] SIGINT during in-flight request does not drop the response
- [ ] Process exits code 0 after all in-flight requests complete
- [ ] No `ECONNRESET` errors during graceful shutdown

### 3. Test Coverage ≥98%
- [ ] `npm test -- --coverage` passes with lines/branches/functions/statements ≥98%
- [ ] CI exits non-zero when coverage drops below threshold
- [ ] Threshold configured in `vitest.config.js`

### 4. setup.sh Idempotency
- [ ] Running `setup.sh` twice produces no errors
- [ ] Existing Node.js ≥18 skips Node installation step
- [ ] Script exits 0 on re-run
