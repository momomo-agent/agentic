# M7: Multi-Round Tool Loop & Code Sandbox Upgrade

## Goals
- Fix multi-round tool loop so ask.ts iterates up to MAX_TOOL_ROUNDS (P1 architecture gap)
- Upgrade code_exec to quickjs-emscripten for true browser-compatible sandbox (P1 architecture gap)

## Tasks
- task-1775530939117: Fix multi-round tool loop in ask.ts (P1)
- task-1775532498831: Upgrade code_exec to quickjs-emscripten sandbox (P1)

## Acceptance Criteria
- `ask()` continues tool rounds until `stopReason !== 'tool_use'` or `MAX_TOOL_ROUNDS` is reached
- code_exec uses quickjs-emscripten instead of new Function() eval
- Browser-compatible isolated sandbox with proper error handling
- All existing tests continue to pass
