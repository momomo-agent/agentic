# Task Design: 多设备脑状态深度共享

## Files to Modify

- **MODIFY** `src/server/brain.js` — add shared history by sessionId
- **MODIFY** `src/server/api.js` — pass sessionId to brain.chat()

## brain.js

Add at top:
```js
const sessionHistories = new Map(); // sessionId → Message[]

export function getHistory(sessionId) {
  if (!sessionHistories.has(sessionId)) sessionHistories.set(sessionId, []);
  return sessionHistories.get(sessionId);
}

export function appendHistory(sessionId, message) {
  getHistory(sessionId).push(message);
}
```

Modify `chat()` signature:
```js
// options.sessionId: string — if provided, use shared history
export async function* chat(messages, options = {})
```

Inside `chat()`:
1. If `options.sessionId`: load history via `getHistory(sessionId)`, prepend to `messages`
2. After full response collected: `appendHistory(sessionId, { role: 'user', content: lastUserMsg })` and `appendHistory(sessionId, { role: 'assistant', content: fullText })`

## api.js

In `POST /api/chat` handler:
- Extract `sessionId` from request body (optional, default `'default'`)
- Pass `{ sessionId }` in options to `brain.chat()`

## Edge Cases

- No sessionId in request → use `'default'` session (backward compatible)
- History grows unbounded → cap at last 50 messages per session (`sessionHistories.get(id).slice(-50)`)
- Concurrent requests same session → history append is synchronous (JS single-threaded, safe)

## Test Cases

- Device A sends "我叫小明" → history stored under sessionId
- Device B sends "我叫什么" with same sessionId → history prepended, LLM sees context
- New device joins existing session → immediately has access to history
- No sessionId → uses 'default', no crash
