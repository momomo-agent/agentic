# Design: src/runtime/memory.js

## File
`src/runtime/memory.js`

## Purpose
Vector-based memory store: add text entries, search by semantic similarity using cosine distance.

## Interface

```js
export async function add(text: string): Promise<void>
export async function remove(key: string): Promise<void>
export { remove as delete }
export async function search(query: string, topK?: number): Promise<Array<{text: string, score: number}>>
```

## Logic

1. `add(text)`: embed text → store `{text, vector}` under key `mem:<ts>:<rand>` → append key to index at `mem:__index__`. Serialize via `_lock` chain to avoid concurrent index corruption.
2. `search(query, topK=5)`: embed query → load all index entries → cosine similarity → sort desc → return top K.
3. `remove(key)`: delete entry from store → filter key from index.
4. Cosine: `dot(a,b) / (|a| * |b|)`, return 0 if either norm is 0.

## Dependencies
- `./embed.js` — `embed(text) → Float32Array`
- `../store/index.js` — `get(key)`, `set(key, val)`, `del(key)`

## Edge Cases
- `search('')` → return `[]` immediately
- Empty index → return `[]`
- `embed()` returns empty array → return `[]`
- Concurrent `add()` calls → serialized via `_lock` promise chain

## Tests
- `add('hello')` → index has 1 entry
- `search('hello')` returns entry with score ~1.0
- `remove(key)` → index shrinks, entry gone
- `search('')` returns `[]`
