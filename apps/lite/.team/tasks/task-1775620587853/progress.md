# Expose streaming API in agentic-lite

## Progress

- Added `askStream()` async generator function to `src/ask.ts` (line 45-69)
- Updated import to include `runAgentLoopStream` and `AgentStreamChunk` from agentic-core
- Exported `askStream` from `src/index.ts`
- Reused existing `handleToolCall` helper and `buildToolDefs` — no code duplication
- Function accepts same `AgenticConfig` as `ask()` with default `{}`
- Delegates to `runAgentLoopStream()` from agentic-core, yielding `AgentStreamChunk` objects
- Accumulators (sources, codeResults, files, shellResults, images) are maintained same as `ask()`

## Verification

- Build succeeds (`npm run build`)
- All 199 tests pass (`npm test`)
- No new code duplication — tool handling shared via `handleToolCall`
