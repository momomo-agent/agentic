# M98: PRD Gap Closure — Critical Path to 90%

## Goal
Close the PRD match gap from 58% to ≥90% by fixing the highest-impact items.

## Scope

### Critical (DBB)
1. **src/index.js missing** — package.json `main` points to src/index.js which doesn't exist. Create it with proper exports (startServer, detector, runtime).
2. **Docker port mismatch** — docker-compose.yml exposes 3000 but app defaults to 1234. Fix docker-compose to use 1234.

### Major (PRD)
3. **Cloud fallback incomplete** — Currently only triggers on Ollama error. PRD requires: timeout >5s trigger, 3 consecutive errors trigger, auto-restore after 60s probe success.
4. **Root docker-compose.yml** — Missing OLLAMA_HOST env var and ./data volume mount.
5. **README troubleshooting** — Add troubleshooting section to README.md.

### Architecture
6. **ARCHITECTURE.md cleanup** — Remove stale CR content (lines 191-252), update directory tree to include all 20+ source files, fix port references from 3000→1234.

## Acceptance Criteria
- `node -e "require('./src/index.js')"` succeeds and exports startServer, detector, runtime
- `docker-compose config` shows port 1234, OLLAMA_HOST, ./data volume
- Cloud fallback triggers on timeout >5s and 3 consecutive errors
- Cloud fallback auto-restores after 60s successful probe
- README.md has troubleshooting section
- ARCHITECTURE.md directory tree matches actual src/ contents
