# M98: PRD Gap Closure — Critical Path to 90%

## Goal
Close the PRD match gap from 58% to ≥90% by fixing the highest-impact items.

## Current Status (2026-04-11)
- 4 tasks in **review** (awaiting tester verification)
- 1 task **in progress** (test suite fix — developer working)
- 1 task **todo** (ARCHITECTURE.md cleanup — architect)
- **Build blocker**: src/runtime/embed.js imports `{ embed }` from agentic-embed but the package only exports `create, chunkText, cosineSimilarity, localEmbed`. Developer must fix this in the test suite task.
- **PRD updated**: References now match engine registry architecture (brain.js fallback, engine/registry.js, engine/init.js)

## Scope

### Critical (DBB) — IN REVIEW
1. **src/index.js** — Created. Awaiting tester verification. (task-1775793599438)
2. **Docker port + OLLAMA_HOST + data volume** — Fixed. Awaiting tester verification. (task-1775793599479)

### Major (PRD) — IN REVIEW / IN PROGRESS
3. **Cloud fallback** — brain.js already implements full spec (timeout >5s, 3 errors, 60s probe). PRD updated to reference brain.js. Awaiting tester verification. (task-1775793599517)
4. **README troubleshooting** — Added. Awaiting tester verification. (task-1775793599556)

### Test Suite — IN PROGRESS
5. **Fix broken tests** — 29 failures across 11 files. Critical build blocker: embed.js import error. Developer working. (task-1775834973520)

### Architecture — TODO
6. **ARCHITECTURE.md cleanup** — Remove stale CR content, update directory tree. Assigned to architect. (task-1775793599594)

## Acceptance Criteria
- `node -e "require('./src/index.js')"` succeeds and exports startServer, detector, runtime
- `docker-compose config` shows port 1234, OLLAMA_HOST, ./data volume
- Cloud fallback triggers on timeout >5s and 3 consecutive errors (brain.js)
- Cloud fallback auto-restores after 60s successful probe (brain.js)
- README.md has troubleshooting section
- ARCHITECTURE.md directory tree matches actual src/ contents
- Build passes (embed.js import fixed)
- Core module tests pass (stt, tts, brain, hub, api)
