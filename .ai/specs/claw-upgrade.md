# agentic-claw Upgrade Spec

## WHY

Watson needs `createClaw()` to be its complete runtime. Current claw uses `agenticAsk` in legacy emit mode. Now that core supports async generator mode, claw should expose structured streaming to Watson.

## WHAT

Upgrade `createClaw()` to:
1. `claw.chat()` returns async generator of ChatEvent (or legacy mode with emit)
2. Session message history persists to disk (via agentic-store)
3. AbortSignal / cancel support
4. Retry single message
5. Provider failover config passthrough
6. Context overflow handling (auto-compact when token limit hit)

## API Changes

### chat() → async generator
```js
// New: streaming
for await (const event of claw.chat('Hello')) {
  if (event.type === 'text_delta') process.stdout.write(event.text)
  if (event.type === 'done') console.log(event.answer)
}

// Legacy: emit callback (backward compat)
const result = await claw.chat('Hello', (type, data) => { ... })
```

### cancel()
```js
const controller = new AbortController()
const gen = claw.chat('Hello', { signal: controller.signal })
// later...
controller.abort()
```

### retry()
```js
// Retry last assistant message
for await (const event of claw.retry()) { ... }
```

### Provider failover
```js
const claw = createClaw({
  providers: [
    { provider: 'anthropic', apiKey: 'sk-1', model: 'claude-sonnet-4' },
    { provider: 'openai', apiKey: 'sk-2', model: 'gpt-4o' },
  ],
  // Falls back to second provider on failure
})
```

### Session persistence
```js
const claw = createClaw({
  persist: '~/.watson/claw',  // existing option
  // Now also persists message history, not just memory
})
```

### Context overflow
```js
const claw = createClaw({
  maxTokens: 8000,
  // When history exceeds maxTokens, auto-compact older messages
  // Uses LLM to summarize, keeps recent messages intact
})
```

## Implementation Plan

### Step 1: chat() async generator mode
- Detect: if 2nd arg is function → legacy emit mode (backward compat)
- If 2nd arg is object (options) or omitted → generator mode
- Internally call `agenticAsk` in generator mode, yield events
- Add memory.user() / memory.assistant() around the call

### Step 2: AbortSignal passthrough
- Accept `signal` in chat options
- Pass through to agenticAsk config
- On abort, clean up memory state

### Step 3: retry()
- Remove last assistant message from session memory
- Re-call agenticAsk with same history (minus last assistant)
- Return async generator of events

### Step 4: Provider failover passthrough
- Accept `providers` array in createClaw options
- Pass through to agenticAsk config

### Step 5: Session history persistence
- On each user/assistant message, persist to store
- On session load, restore from store
- Use agentic-store if available, fallback to JSON file

### Step 6: Context overflow handling
- Before each agenticAsk call, check token estimate of history
- If over maxTokens, compact older messages (summarize via LLM)
- Keep last N messages intact

## Files to modify
- `packages/claw/agentic-claw.js` (~540 lines)

## Tests to add
- chat() generator mode yields ChatEvent
- chat() legacy emit mode still works
- retry() replays last turn
- AbortSignal cancels chat
- Provider failover config passes through
- Session persistence saves/loads history

## Constraints
- Zero dependencies (peer deps only)
- UMD wrapper preserved
- Backward compatible — existing createClaw() usage unchanged
