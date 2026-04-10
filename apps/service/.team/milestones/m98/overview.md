# M98: PRD Gap Closure — Critical Path to 90%

## Goal
Close the PRD match gap from 58% to ≥90% by fixing the highest-impact items.

## Current Status (2026-04-11, cycle 21)
- **6 of 9 tasks DONE** — verified and complete
- **3 tasks in REVIEW** — waiting for tester verification
  - task-1775844314020: Fix embed.js build failure (developer) — fix applied, default import + destructure pattern
  - task-1775840057892: Remove dead import maps from package.json (developer) — #agentic-voice removed in e699e630
  - task-1775793599594: ARCHITECTURE.md cleanup (architect) — 23-line diff: removes stale files, adds index.js, fixes Docker port docs
- **Build: PASSING** — `require('./src/index.js')` loads OK (verified 2026-04-11)
- **Tests: 845/845 passing** — 0 failures, 166 test files
- **PRD: up to date** — all file paths corrected, all features documented
- **All CRs resolved** — 0 pending change requests
- **Gap scores are STALE** — PRD 58%, DBB 72%, Architecture 85% all need re-scan; all known gaps addressed

## BLOCKING — Tester Review Required
- **tester MUST review task-1775844314020** (embed.js build fix) to close
- **tester MUST review task-1775840057892** (dead import maps removal) to close
- **tester MUST review task-1775793599594** (ARCHITECTURE.md cleanup) to close
- PM cannot approve review tasks — only tester can move review → done
- All 3 review tasks have verified implementations; milestone closes when tester approves them

## Completed
1. ✅ src/index.js entry point created (task-1775793599438)
2. ✅ Docker port 1234 + OLLAMA_HOST + data volume (task-1775793599479)
3. ✅ Cloud fallback: timeout >5s, 3 errors, 60s probe (task-1775793599517)
4. ✅ README troubleshooting section (task-1775793599556)
5. ✅ Test suite fixed — embed.js CJS/ESM import (task-1775834973520)
6. ✅ m95 tests already passing — no fix needed (task-1775845910358)

## In Review
7. **REVIEW**: Fix embed.js build failure — default import pattern (task-1775844314020)
8. **REVIEW**: Remove dead import maps from package.json (task-1775840057892)
9. **REVIEW**: ARCHITECTURE.md cleanup — directory tree updated, stale refs removed (task-1775793599594)
