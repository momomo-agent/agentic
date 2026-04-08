# Design: Fix multi-round agent loop

## File
`src/ask.ts`

## Analysis
The loop already exists and looks correct. The issue may be in how tool results are appended to messages, or in provider response parsing.

## Verification Steps
1. Confirm `response.stopReason === 'tool_use'` is correctly set by both Anthropic and OpenAI providers
2. Confirm `messages.push({ role: 'assistant', content: response.rawContent })` preserves Anthropic tool_use blocks
3. Confirm `messages.push({ role: 'tool', content: [...] })` format matches what each provider expects

## Edge Cases
- If `response.toolCalls` is empty but `stopReason === 'tool_use'`: loop exits (already handled by `|| response.toolCalls.length === 0`)
- After MAX_TOOL_ROUNDS: throws Error (correct)

## Test Cases (DBB-001, DBB-002)
- Call `ask()` with prompt requiring 2 sequential tool calls → final result has text answer
- Mock provider that always returns `tool_use` → loop terminates after MAX_TOOL_ROUNDS
