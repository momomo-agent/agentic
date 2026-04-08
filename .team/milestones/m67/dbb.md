# M67 DBB — Docker + Graceful Shutdown + Setup

## Verification Criteria

### Docker
- [ ] `docker-compose up --build` completes without error
- [ ] Container reaches healthy state (health check passes)
- [ ] `GET http://localhost:3000/api/status` returns 200 from inside container

### SIGINT Graceful Drain
- [ ] Sending SIGINT while SSE stream is active: stream completes or closes cleanly (no ECONNRESET)
- [ ] Process exits with code 0 after drain
- [ ] Test: `test/sigint.test.js` passes

### setup.sh
- [ ] Detects Node.js ≥18 on macOS and Linux
- [ ] Re-running setup.sh on already-configured system produces no errors and no duplicate installs
- [ ] Missing Node.js triggers clear error message with install instructions
