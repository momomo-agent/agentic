# M92 DBB — Test Fix + PRD Closure

## Verification Criteria

### 1. Stale Mock Fixes
- [ ] m87-sense-pipeline, m84-sense-external-package, m77-sense-imports all pass
- [ ] All `AgenticSense` mocks include `init()` method
- [ ] m87 `createPipeline()` async handling correct
- [ ] m77 `#agentic-sense` import map absence assertion passes

### 2. Docker Files in Project Root
- [ ] `Dockerfile` exists at project root
- [ ] `docker-compose.yml` exists at project root
- [ ] `docker build .` succeeds from project root

### 3. README.md in Project Root
- [ ] `README.md` exists at project root
- [ ] Contains `npx agentic-service` quickstart
- [ ] Contains `docker run` command
- [ ] Contains API endpoints overview

### 4. Test Pass Rate >=90%
- [ ] `npm test` shows >= 599/665 tests passing
