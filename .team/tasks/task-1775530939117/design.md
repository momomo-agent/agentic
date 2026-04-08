# Task Design: Fix Multi-Round Tool Loop in ask.ts

## File to Modify
`src/ask.ts`

## Investigation First
The current `ask.ts` already has a `for (let round = 0; round < MAX_TOOL_ROUNDS; round++)` loop. Developer must verify whether the loop actually continues correctly or exits early.

## Expected Correct Loop Structure

```ts
for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
  const response = await provider.chat(messages, toolDefs, config.systemPrompt)
  totalUsage.input += response.usage.input
  totalUsage.output += response.usage.output

  if (response.stopReason !== 'tool_use' || response.toolCalls.length === 0) {
    return { answer: response.text, ... }
  }

  // execute tools, append messages, continue loop
}
throw new Error(`Agent loop exceeded ${MAX_TOOL_ROUNDS} rounds`)
```

## Fix If Needed
If the loop has a `break` or early `return` after the first tool round, remove it so the loop continues naturally.

## Dependencies
- Blocked by task-1775530933189 (custom provider must land first)

## Test Cases
1. Provider returns `tool_use` for rounds 1-3, then `end` on round 4 → returns answer, no throw
2. Provider returns `tool_use` for 10 rounds → throws `Agent loop exceeded 10 rounds`
3. Provider returns `end` on round 1 (no tools) → returns immediately
