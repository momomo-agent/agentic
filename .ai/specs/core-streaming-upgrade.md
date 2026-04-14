# agentic-core Streaming Upgrade Spec

## WHY

Watson (Electron AI workbench) wants to use `createClaw()` as its runtime instead of maintaining its own LLM client layer (7+ files). But `agenticAsk` currently returns `{answer, rounds, messages}` — Watson needs structured streaming events to update UI in real-time (text tokens, tool calls, status changes).

## WHAT

Upgrade `agenticAsk` to be an async generator that yields structured `ChatEvent` objects, while keeping backward compatibility (the `emit()` callback still works).

## ChatEvent Schema

```js
// Every yield is one of these:
{ type: 'text_delta', text: 'chunk...' }
{ type: 'tool_use', id: 'toolu_xxx', name: 'search', input: {...} }
{ type: 'tool_result', id: 'toolu_xxx', name: 'search', output: {...} }
{ type: 'tool_error', id: 'toolu_xxx', name: 'search', error: 'msg' }
{ type: 'status', message: 'Round 2/5' }
{ type: 'warning', level: 'warning'|'critical', message: '...' }
{ type: 'error', error: 'msg', category?: string, retryable?: boolean }
{ type: 'done', answer: 'full text', rounds: 3, stopReason: 'end_turn' }
```

## API Change

### Before
```js
const result = await agenticAsk(prompt, config, emit)
// result = { answer, rounds, messages }
```

### After
```js
// New: async generator
for await (const event of agenticAsk(prompt, config)) {
  if (event.type === 'text_delta') process.stdout.write(event.text)
  if (event.type === 'done') console.log('Answer:', event.answer)
}

// Backward compat: emit callback still works
const result = await agenticAsk(prompt, config, emit)
// When emit is passed, collects events internally and returns {answer, rounds, messages}
// emit() is called for each event as before
```

### Detection logic
- If 3rd arg (`emit`) is a function → legacy mode, return Promise<{answer, rounds, messages}>
- If 3rd arg is omitted or not a function → generator mode, return AsyncGenerator<ChatEvent>

## Implementation Plan

### Step 1: Refactor streaming in anthropicChat / openaiChat
- Both functions already parse SSE internally
- Extract the SSE parsing into generator functions that yield ChatEvent
- `anthropicChat` → `async function* streamAnthropic()` yields ChatEvent
- `openaiChat` → `async function* streamOpenAI()` yields ChatEvent

### Step 2: Refactor agenticAsk into generator
- `async function* _agenticAskGen(prompt, config)` — the real implementation
- Yields ChatEvent for each token, tool call, tool result, status, done
- Tool loop stays the same, just yields events instead of collecting

### Step 3: Backward-compatible wrapper
```js
async function agenticAsk(prompt, config, emit) {
  if (typeof emit === 'function') {
    // Legacy mode: collect and return
    let answer = ''
    let rounds = 0
    for await (const event of _agenticAskGen(prompt, config)) {
      emit(event.type, event)
      if (event.type === 'text_delta') answer += event.text
      if (event.type === 'done') { answer = event.answer; rounds = event.rounds }
    }
    return { answer, rounds }
  }
  // Generator mode
  return _agenticAskGen(prompt, config)
}
```

### Step 4: Add AbortSignal support
- `config.signal` — AbortSignal for cancellation
- Pass through to fetch() calls
- Check signal.aborted before each tool execution
- Yield `{ type: 'error', error: 'aborted' }` on abort

### Step 5: Add provider failover
- `config.providers` — array of `{ provider, apiKey, baseUrl, model }`
- Try each in order, on retryable error move to next
- Yield `{ type: 'status', message: 'Switching to provider X' }` on failover
- Retryable: 429, 500, 502, 503, 529, network errors
- Non-retryable: 401, 403 (skip immediately)

### Step 6: Add error classification
- Classify errors into categories: rate_limit, auth, billing, server, network, context_overflow, unknown
- Include in error events: `{ type: 'error', error: msg, category: 'rate_limit', retryable: true }`

## Files to modify
- `packages/core/agentic-core.js` — main implementation (1160 lines)

## Tests to add
- Generator mode yields correct ChatEvent sequence
- Legacy emit mode still works (backward compat)
- AbortSignal cancels mid-stream
- Provider failover on 429/500
- Error classification
- Tool loop yields tool_use + tool_result events

## Constraints
- Zero dependencies (core is browser-compatible)
- UMD wrapper must be preserved
- All existing tests must pass
- `emit()` callback mode must work exactly as before
