# M95: Final Push — Architecture Docs + CPU Profiling + Gap Re-evaluation

## Goal
Close the remaining gaps to reach Vision >=90% and PRD >=90%.

## Context
- M92 (test fixes, Docker, README) — completed
- M93 (STT/TTS, wake word, cloud fallback verification) — completed
- M94 (voice latency benchmark, CDN fallback verification) — completed (2/3 tasks)
- M96 (architecture docs + CPU profiling) — cancelled, tasks absorbed here
- Gap files are stale (last updated Apr 7). ARCHITECTURE.md sections 5-8 already added (tunnel, CLI, VAD, HTTPS/middleware)
- Remaining Vision gaps: agentic-embed docs (partial), CPU profiling (missing)
- Test pass rate already >=90%, agentic-sense wiring verified

## Tasks (4 total)

### Task 1: Review and merge Architecture CR for undocumented modules — DONE
- Added matcher.js, ollama.js, memory.js API to ARCHITECTURE.md
- CR-1775569100684 resolved; all 56 tests pass

### Task 2: Document agentic-embed in ARCHITECTURE.md — DONE
- CRs cr-1775579949939 and cr-1775580105000 reviewed
- agentic-embed CR (cr-1775609587772) auto-merged by process-crs
- ARCHITECTURE.md now has full module coverage

### Task 3: Implement CPU profiling instrumentation — DONE
- Added profiler marks to memory.js (memory-add, memory-search)
- Added voice-pipeline profiler mark to /api/voice endpoint
- All 6 pipeline stages profiled: stt, llm, tts, memory-add, memory-search, voice-pipeline
- All 26 tests pass

### Task 4: Run fresh DBB/PRD/Vision gap evaluation — UNBLOCKED, READY
- **Owner:** tester | **Priority:** P0
- All blockers (Tasks 1-3) complete
- Gap files are stale (Apr 7) — fresh evaluation needed
- Since Apr 7: Docker, README, architecture docs, CPU profiling, test fixes all completed
- Target: Vision >=90%, PRD >=90%, DBB >=90%

## Acceptance Criteria
- [x] CR-1775569100684 reviewed and ARCHITECTURE.md updated
- [x] ARCHITECTURE.md documents agentic-embed integration (Section 9)
- [x] CPU profiling instrumentation implemented and functional
- [ ] Fresh gap evaluation shows Vision >=90%, PRD >=90%, DBB >=90%

## Priority
P0 — final milestone to reach project goals (Vision >=90%, PRD >=90%)
