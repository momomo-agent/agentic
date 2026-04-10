# M99: Architecture Documentation Gap Closure — DBB

## Done Criteria

1. ARCHITECTURE.md contains a formal module section for `src/store/index.js` with:
   - Exports: `get(key)`, `set(key, value)`, `del(key)`, `delete` alias
   - Lazy init via `open(DB_PATH)` from agentic-store
   - DB path: `~/.agentic-service/store.db`
   - Consumer: `runtime/memory.js`

2. ARCHITECTURE.md contains formal module sections for:
   - `src/runtime/embed.js` — `embed(text) → number[]` via agentic-embed `localEmbed`
   - `src/runtime/adapters/embed.js` — dead code stub (throws 'not implemented')
   - `src/runtime/adapters/sense.js` — `createPipeline()` wrapping AgenticSense
   - `src/runtime/adapters/voice/*` — 7 adapters (elevenlabs, macos-say, openai-tts, openai-whisper, piper, sensevoice, whisper)

3. ARCHITECTURE.md documents utility modules:
   - `src/runtime/profiler.js` — `startMark/endMark/getMetrics/measurePipeline`
   - `src/runtime/latency-log.js` — `record/p95/reset`
   - `src/detector/sox.js` — `ensureSox()`
   - `src/cli/download-state.js` — `getDownloadState/setDownloadState/clearDownloadState`

4. VISION.md directory tree matches actual codebase structure (no phantom files like `detector/optimizer.js`, `runtime/llm.js`)

## Blockers

- None identified. All source files verified and existing.

## Budget

- 4 tasks, all documentation-only (no code changes)
- Estimated: architect writes ~200 lines of ARCHITECTURE.md additions + VISION.md tree update
