# M96: Final Vision Push — DBB Verification Criteria

## Goal
Close remaining gaps to reach Vision ≥90% and PRD ≥90%.

## Design-Before-Build Verification Checklist

### 1. Architecture Docs — agentic-embed Section

**Given:** ARCHITECTURE.md exists with sections 5–8 (Tunnel, CLI, VAD, HTTPS)
**When:** Developer adds section documenting agentic-embed integration
**Then:**
- [ ] ARCHITECTURE.md contains a section titled "agentic-embed" or equivalent
- [ ] Section documents `src/runtime/embed.js` with function signature: `embed(text: string) → number[]`
- [ ] Section references `agentic-embed` external package dependency
- [ ] Section documents bge-m3 as the vector embedding model
- [ ] Section documents integration with `memory.js` for semantic search
- [ ] Architecture match evaluator reports ≥95% on architecture docs

### 2. Architecture CRs — Pending Review

**Given:** Two pending CRs (cr-1775579949939, cr-1775580105000)
**When:** Developer reviews and marks CRs as reviewed/merged
**Then:**
- [ ] Both CRs have status "reviewed" (not "pending")
- [ ] All requested documentation sections (Tunnel, CLI, VAD, HTTPS) confirmed present in ARCHITECTURE.md

### 3. CPU Profiling Instrumentation

**Given:** `src/runtime/profiler.js` exists with `startMark`/`endMark`/`getMetrics`
**Given:** `stt.js`, `tts.js`, `llm.js` already import profiler marks
**Given:** `/api/perf` endpoint already returns `getMetrics()` data
**When:** Developer verifies existing instrumentation is functional and complete
**Then:**
- [ ] `startMark('stt')` / `endMark('stt')` wrapping `adapter.transcribe()` in stt.js
- [ ] `startMark('tts')` / `endMark('tts')` wrapping `adapter.synthesize()` in tts.js
- [ ] `startMark('llm')` / `endMark('llm')` wrapping Ollama + cloud fallback in llm.js
- [ ] `/api/perf` endpoint returns `{ stage: { last, avg, count } }` for stt, tts, llm
- [ ] `measurePipeline()` available for end-to-end pipeline timing
- [ ] Unit test for profiler module passes (`test/m80-profiler.test.js` or `test/m88-profiler-metrics.test.js`)
- [ ] Integration test: GET `/api/perf` returns 200 with timing data after at least one STT/LLM/TTS operation

### 4. Vision Score ≥90%

**Given:** Vision gap evaluation system exists
**When:** Fresh gap evaluation is run
**Then:**
- [ ] Vision score ≥90% (at least 18/19 gaps resolved)
- [ ] No remaining "MISSING" status items

### 5. PRD Score ≥90%

**Given:** PRD gap evaluation system exists
**When:** Fresh gap evaluation is run
**Then:**
- [ ] PRD score ≥90%
- [ ] All P0 PRD requirements verified as implemented or documented
