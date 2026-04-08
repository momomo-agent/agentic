# Design: src/runtime/memory.js

## Status
File already exists at `src/runtime/memory.js` with full implementation.

## Interface
```javascript
add(text: string): Promise<void>
search(query: string, topK?: number): Promise<Array<{text: string, score: number}>>
remove(key: string): Promise<void>
delete(key: string): Promise<void>  // alias for remove
```

## Key Logic
- `add`: embeds text via `agentic-embed`, stores `{text, vector}` in agentic-store, updates index at `mem:__index__`
- `search`: embeds query, loads all indexed entries, returns top-K by cosine similarity
- `remove`: deletes entry from store and removes from index
- Serial writes via `_lock` promise chain to prevent index corruption

## Edge Cases
- `search('')` → returns `[]`
- Empty index → returns `[]`
- `embed` returns empty vector → returns `[]`

## Test Cases
- `add('hello')` then `search('hello', 1)` returns entry with score > 0.9
- `remove(key)` removes entry from subsequent searches
