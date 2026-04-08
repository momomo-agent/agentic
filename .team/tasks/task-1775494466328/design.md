# Design: 记忆模块 memory.js

## File
`src/runtime/memory.js`

## Interface
```js
add(text: string): Promise<void>
search(query: string, topK?: number): Promise<Array<{ text: string, score: number }>>
```

## Logic
- `add(text)`: embed(text) → store.set(id, { text, vector })
- `search(query, topK=5)`:
  1. If query is empty → return []
  2. embed(query) → queryVec
  3. Load all entries from store
  4. Compute cosine similarity for each
  5. Sort desc, return top topK as `{ text, score }`

## Dependencies
- `agentic-embed`: `embed(text) → Float32Array`
- `agentic-store`: `get/set/list` KV API

## Edge Cases
- Empty query → `[]`
- Empty store → `[]`
- Concurrent writes: use sequential store.set calls (store handles atomicity)

## Test Cases
- `search("")` → `[]`
- `search("x")` on empty store → `[]`
- `add("hello")` then `search("hello")` → length >= 1
- 10 concurrent `add()` calls → all retrievable
