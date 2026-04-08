# Fix askStream() to use runAgentLoopStream instead of legacy agenticAsk

## Changes Made

### 1. `package.json` — Updated agentic-core dependency
- Changed from `file:../agentic-core` (old npm bundle with only `agenticAsk`) to `file:./packages/agentic-core` (local source with `runAgentLoop` and `runAgentLoopStream`)

### 2. `src/ask.ts` — Rewrote both `ask()` and `askStream()`
- **Before**: Used legacy `agenticAsk` from agentic-core with callback-based emit pattern
- **After**: Uses new provider-based API:
  - `createProvider()` to build Provider from config (supports `customProvider`)
  - `runAgentLoop()` for `ask()` (non-streaming)
  - `runAgentLoopStream()` for `askStream()` (streaming)
- Added `search` tool to `buildTools()` (was missing — search was not wired up)
- Imported `searchToolDef` and `executeSearch` from `./tools/search.js`
- Added `imagesCollector` parameter to `buildTools` to collect images from search results
- Search tool returns `r.text` (not JSON.stringify) and pushes images into collector

### 3. `src/types.ts` — Added `customProvider` field + fixed type constraints
- Added `customProvider?: import('agentic-core').Provider` to `AgenticConfig`
- Changed `usage?:` to `usage:` (required per m15-types-prd.test.ts)
- Changed `images?:` to `images:` (required per m15-types-prd.test.ts)

## Test Results
- `ask-stream.test.ts`: 12/12 pass
- `ask-images.test.ts`: 2/2 pass (images properly collected from search tool)
- `m15-types-prd.test.ts`: 3/3 pass (type definitions corrected)
- Full suite: 213/213 pass

## Key Architecture Change
The old `agenticAsk` managed its own provider creation, message building, and agent loop. The new approach:
1. `createProvider()` — builds a Provider object with `chat()` and `stream()` methods
2. `runAgentLoop()` / `runAgentLoopStream()` — manages multi-round agent loop
3. `executeToolCall` — callback for tool execution (maps tool names to agentic-lite implementations)
