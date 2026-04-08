# Design: src/runtime/llm.js 实现

## Files
- `src/runtime/llm.js` — verify/fix chat() export signature

## Current State
llm.js already exists with `chat(message, options)` signature. Architecture requires:
```js
chat(messages, options) → stream  // messages = array
```
Current impl takes `(message, options)` where message is a string, then prepends to history.

## Required Fix
Export signature must accept messages array directly per ARCHITECTURE.md:
```js
export async function* chat(messages: Array<{role: string, content: string}>, options?: object): AsyncGenerator
```

Change `chat(message, options)` to `chat(messages, options)` where messages is already the full array (no prepending).

## Algorithm
1. Remove `const { history = [] } = options` and `const messages = [...history, { role: 'user', content: message }]`
2. Accept `messages` directly as first param
3. Pass `messages` to `chatWithOllama` and cloud fallbacks unchanged

## Edge Cases
- Empty messages array → Ollama will error; let it propagate (DBB-008)
- Ollama unavailable → falls back to cloud provider (existing logic)

## Test Cases (DBB-007, DBB-008)
- `chat([{ role: 'user', content: 'hello' }])` → AsyncGenerator yielding `{type, content}` chunks
- `chat([...])` with Ollama down → yields `{type:'meta', provider:'cloud'}` then cloud chunks
- `chat([...])` with Ollama down and no API key → throws Error with non-empty message
