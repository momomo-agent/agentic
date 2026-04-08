# M96: Final Vision Push — Technical Design

## Overview

Two tasks to close Vision/PRD gaps to ≥90%. The key insight: most infrastructure already exists — the work is verification, documentation, and ensuring the existing profiler is properly exposed.

## Task 1: Review/merge Architecture CRs + document agentic-embed

### Problem
- ARCHITECTURE.md sections 5–8 (Tunnel, CLI, VAD, HTTPS/Middleware) are already present
- Two pending CRs requested these — they are now stale/duplicate
- agentic-embed (Section 9) is still missing from ARCHITECTURE.md

### Approach
1. Mark both CRs (`cr-1775579949939`, `cr-1775580105000`) as reviewed — their requested sections already exist
2. Add agentic-embed section to ARCHITECTURE.md documenting:
   - `src/runtime/embed.js` — `embed(text) → number[]` wrapping `agentic-embed` package
   - bge-m3 model for vector embeddings
   - `src/runtime/memory.js` integration for semantic search

### Files
- `.team/change-requests/cr-1775579949939.json` — update status to "reviewed"
- `.team/change-requests/cr-1775580105000.json` — update status to "reviewed"
- `ARCHITECTURE.md` — add agentic-embed section (via CR to L1, not direct edit)

### CR Strategy
Since ARCHITECTURE.md is a protected file (L1), the developer must submit a new CR to request the agentic-embed section addition, rather than editing directly.

## Task 2: CPU Profiling Instrumentation

### Current State (Already Implemented)
The profiler infrastructure is already in place:

**`src/runtime/profiler.js`:**
```javascript
startMark(label: string) → void     // stores Date.now()
endMark(label: string) → number|null // returns elapsed ms, updates metrics
getMetrics() → { [label]: { last: number, avg: number, count: number } }
measurePipeline(stages: Array<{durationMs}>) → { stages, total, pass }
```

**Integration already done:**
- `stt.js:33-36` — `startMark('stt')` / `endMark('stt')` around `adapter.transcribe()`
- `tts.js:35-38` — `startMark('tts')` / `endMark('tts')` around `adapter.synthesize()`
- `llm.js:119-145` — `startMark('llm')` / `endMark('llm')` around chat generators
- `api.js:9` — imports `getMetrics` from profiler
- `api.js:180` — `GET /api/perf` returns `getMetrics()`

**Also integrated:** `latency-log.js` records (`record('stt')`, `record('llm_ttft')`, etc.)

### Approach
The instrumentation is already functional. Task 2 should:
1. Verify existing profiler works end-to-end
2. Write/verify tests for profiler module
3. Confirm `/api/perf` endpoint returns meaningful data
4. If any gaps found (e.g., missing profiling for voice pipeline stages), add them

### Potential Enhancements (if gaps found)
- Add profiler marks to `memory.js` operations (embed + search)
- Add profiler marks to voice pipeline (`/api/voice` endpoint's STT→LLM→TTS flow)
- Expose pipeline summary via `measurePipeline()` from `/api/perf`

### Test Files
- `test/m80-profiler.test.js` — basic profiler unit tests
- `test/m88-profiler-metrics.test.js` — metrics accumulation tests

## Dependencies
- Task 1 has no dependencies
- Task 2 has no dependencies (profiler infrastructure already exists)
- Tasks are independent and can be parallelized

## Risk
- Low risk: both tasks are verification/documentation focused
- The actual code infrastructure is already in place
