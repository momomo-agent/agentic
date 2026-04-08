# Design: src/runtime/memory.js — 记忆运行时 (M32)

## File
`src/runtime/memory.js` — already exists, verify and extend

## Current Implementation
- `add(text)` — embed + store in KV with serial lock
- `search(query, topK=5)` — cosine similarity search
- `remove(key)` / `delete(key)` — remove entry + update index

## Missing: store/retrieve by key interface
```js
export async function store(key: string, value: any): Promise<void>
export async function retrieve(key: string): Promise<any>
```
These wrap `set(key, value)` / `get(key)` from `../store/index.js` directly.

## Complete Interface
```js
// Semantic long-term memory
export async function add(text: string): Promise<void>
export async function search(query: string, topK?: number): Promise<Array<{text, score}>>
export async function remove(key: string): Promise<void>

// Key-value store wrappers
export async function store(key: string, value: any): Promise<void>
export async function retrieve(key: string): Promise<any>
```

## Edge Cases
- `store`/`retrieve` with undefined key → pass through to KV (KV handles)
- `search('')` → returns `[]` (already handled)
- Concurrent `add()` → serial lock (already handled)

## Dependencies
- `./embed.js` — vector embedding
- `../store/index.js` — KV persistence

## Tests
- `store('k', {x:1})` → `retrieve('k')` returns `{x:1}`
- `retrieve('missing')` → returns `null`/`undefined`
- `add` + `search` round-trip returns matching text
