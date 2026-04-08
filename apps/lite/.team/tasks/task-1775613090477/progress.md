# 重构 ask.ts — 换用 agentic-core

## Changes Made

### 1. Added agentic-core dependency
- `package.json`: Added `"agentic-core": "link:./packages/agentic-core"` to dependencies
- `tsup.config.ts`: Added `agentic-core` to external list

### 2. Replaced local provider implementations with agentic-core re-exports
- `src/providers/provider.ts`: Replaced local type definitions and `createProvider` with re-exports from `agentic-core`
- `src/providers/index.ts`: Replaced local re-exports with re-exports from `agentic-core`

### 3. Refactored ask.ts (140 lines → 99 lines)
- Imported `runAgentLoop` and `createProvider` from `agentic-core`
- Replaced inline loop with `runAgentLoop()` call
- Tool execution via closure callback that populates accumulators
- `handleToolCall` function replaces `executeSingleTool` + `executeToolCalls`

## Verification
- All 32 test files pass (174 tests)
- Build succeeds
- ask.ts is 99 lines (< 100 requirement met)

## Notes
- The task's blocker (task-1775615923116) is in 'review' status but its work is complete (agentic-core package builds and exports correctly)
- Local anthropic.ts and openai.ts are kept but no longer imported (index.ts and provider.ts re-export from agentic-core)
- agentic-core's ProviderConfig is structurally compatible with AgenticConfig (superset)
