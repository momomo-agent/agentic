# Task Design: src/runtime/memory.js

## Status
File already exists with working implementation. This task is to verify and complete it.

## File
- `src/runtime/memory.js` — modify/complete in place

## Current Implementation
The file already implements:
- `add(text)` — embeds text via `embed.js`, stores vector+text in KV store, updates index
- `search(query, topK=5)` — embeds query, cosine similarity search over index
- `remove(key)` / `delete(key)` — removes entry and updates index
- Serial write lock via `_lock` promise chain

## Missing / To Verify

### 1. Short-term memory (session context)
The current implementation only has long-term persistent memory. Need to add:

```js
// In-memory session store (short-term, not persisted)
const _session = []  // [{ role, content }]

export function addSession(role, content) {
  _session.push({ role, content })
  if (_session.length > 20) _session.shift()  // cap at 20 turns
}

export function getSession() {
  return [..._session]
}

export function clearSession() {
  _session.length = 0
}
```

### 2. Function signatures (complete interface)

```js
// Long-term (persisted via agentic-store)
add(text: string): Promise<void>
search(query: string, topK?: number): Promise<Array<{text: string, score: number}>>
remove(key: string): Promise<void>

// Short-term (in-memory session)
addSession(role: 'user'|'assistant'|'system', content: string): void
getSession(): Array<{role: string, content: string}>
clearSession(): void
```

## Dependencies
- `./embed.js` — vector embedding (bge-m3)
- `../store/index.js` — KV persistence (get/set/del)

## Edge Cases
- `embed()` returns empty/null → `search()` returns `[]` (already handled)
- Empty index → `search()` returns `[]` (already handled)
- Concurrent `add()` calls → serial lock prevents race (already handled)
- Session overflow → cap at 20 entries with `shift()`

## Test Cases
1. `add("hello")` → index grows by 1, entry retrievable via `get()`
2. `search("hello", 1)` → returns `[{text: "hello", score: ~1.0}]`
3. `search("")` → returns `[]`
4. `remove(key)` → entry gone from index
5. `addSession("user", "hi")` + `getSession()` → returns `[{role:"user", content:"hi"}]`
6. Add 21 session entries → `getSession().length === 20`
7. `clearSession()` → `getSession()` returns `[]`
