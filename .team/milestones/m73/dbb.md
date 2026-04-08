# M73 DBB — Docker, SIGINT, Coverage, Setup

## Verification Criteria

### Docker (task-1775529070735)
- [ ] `docker build -f install/Dockerfile .` exits 0
- [ ] `docker-compose -f install/docker-compose.yml up -d` starts container
- [ ] `curl http://localhost:3000/api/status` returns 200

### SIGINT graceful drain (task-1775529080454)
- [ ] SIGINT sent during active /api/chat stream waits for response to complete before exit
- [ ] `startDrain()` + `waitDrain()` called in SIGINT handler in bin/agentic-service.js
- [ ] Process exits 0 after drain completes

### Coverage threshold (task-1775529080487)
- [ ] vitest.config.js has `coverage.thresholds` set to 98 for lines/functions/branches/statements
- [ ] `vitest run --coverage` fails (non-zero exit) when coverage < 98%

### setup.sh idempotency (task-1775529080520)
- [ ] Re-running setup.sh on system with Node.js >= 18 prints "already installed" and exits 0
- [ ] No duplicate npm installs or side effects on second run
- [ ] `command -v node` check gates install_node call
