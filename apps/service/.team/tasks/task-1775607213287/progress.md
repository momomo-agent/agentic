# Implement CPU profiling instrumentation for voice latency measurement

## Changes Made

### 1. src/runtime/memory.js — Added profiler marks
- Imported `startMark` and `endMark` from `./profiler.js`
- `add()`: wrapped with `startMark('memory-add')` / `endMark('memory-add')`
- `search()`: wrapped with `startMark('memory-search')` / `endMark('memory-search')`
- Early returns in search() also call `endMark()` to avoid orphaned marks

### 2. src/server/api.js — Added voice-pipeline profiler mark
- Extended import: `import { getMetrics, startMark, endMark } from '../runtime/profiler.js'`
- `/api/voice` endpoint: wrapped STT→LLM→TTS pipeline with `startMark('voice-pipeline')` / `endMark('voice-pipeline')`
- Existing `Date.now()` timing preserved alongside profiler marks

### Verification
- `npx vitest run test/m80-profiler.test.js test/m88-profiler-metrics.test.js` — **8/8 tests pass**
- Profiler marks now cover: stt, llm, tts, memory-add, memory-search, voice-pipeline
- `/api/perf` endpoint will report all timing data including new marks
