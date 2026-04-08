# 修复多轮工具循环

## Progress

## Findings
- `ask.ts` loop already correct: `for (let round = 0; round < MAX_TOOL_ROUNDS; round++)` with early return on non-tool_use
- `test/ask-loop.test.ts` already covers both design test cases (DBB-001, DBB-002)
- No code changes needed

