# Task Design: 修复多轮工具循环

## Status
Looking at `src/ask.ts`, the loop is already correctly implemented with `MAX_TOOL_ROUNDS = 10`. The loop continues until `stopReason !== 'tool_use'`. This task may be a verification/test task.

## Files to Modify
- `src/ask.ts` — verify loop logic is correct (no change needed if already fixed)
- `test/ask.test.ts` — add test for multi-round tool loop

## Verification
The current `ask.ts` loop at lines 30–55 already:
- Loops `for (let round = 0; round < MAX_TOOL_ROUNDS; round++)`
- Returns only when `stopReason !== 'tool_use'`
- Throws after `MAX_TOOL_ROUNDS`

## Test Cases
1. Mock provider returns `tool_use` for rounds 1–2, then `end` on round 3 → `ask()` resolves with final answer
2. Mock provider always returns `tool_use` → `ask()` throws after 10 rounds
