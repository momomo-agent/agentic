# M4 Technical Design: Agentic Loop Correctness & System Prompt

## Overview

Four targeted fixes to `src/ask.ts` and `src/providers/provider.ts`. No new files needed.

## Tasks

1. **task-1775528295380** — Fix multi-round tool loop in `ask.ts`
2. **task-1775528302103** — Fix `images` field lost in final-response branch
3. **task-1775528309091** — Add `systemPrompt` support (already in types; wire through)
4. **task-1775528309123** — Implement custom provider hook in `createProvider()`

## Notes

- `ask.ts` already has `MAX_TOOL_ROUNDS = 10` and a loop skeleton; tasks 1–3 are fixes within that file
- `provider.ts` `createProvider()` already handles `custom` case correctly per current source; task 4 may be a no-op or needs a test
- All changes are isolated; tasks can be implemented independently
