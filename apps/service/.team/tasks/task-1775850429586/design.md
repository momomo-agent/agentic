# Task Design: Implement src/runtime/memory.js — semantic memory API

**Task ID:** task-1775850429586
**Module:** Runtime (ARCHITECTURE.md §3)
**Module Design:** `.team/designs/runtime.design.md`
**Status:** ready-for-review
**Priority:** P2 (deprioritized — not required for Vision ≥90% + PRD ≥90% goal)

## Context

ARCHITECTURE.md §3 and the Vision architecture mapping table both note that `src/runtime/memory.js` does NOT exist. The PRD does not explicitly require it. The building blocks are ready:
- `src/store/index.js` — KV storage via agentic-store (verified: `get/set/del/delete`)
- `src/runtime/embed.js` — vector embedding via agentic-embed (verified: `embed(text) → number[]`)

This module would compose them into a semantic memory layer: store text with embeddings, retrieve by similarity.

## Verified Dependencies

| Import | From | Verified |
|--------|------|----------|
| `get(key)` | `../store/index.js` | ✅ line 13 — returns parsed JSON or null |
| `set(key, value)` | `../store/index.js` | ✅ line 19 — JSON.stringify before write |
| `del(key)` | `../store/index.js` | ✅ line 24 |
| `embed(text)` | `./embed.js` | ✅ line 4 — returns `number[]`, throws TypeError on non-string |

## File to Create

`src/runtime/memory.js` (~60 lines)

## Proposed Exports

```javascript
export async function add(text, metadata = {})
// 1. vector = await embed(text)
// 2. id = crypto.randomUUID()
// 3. entry = { id, text, vector, metadata, createdAt: Date.now() }
// 4. await set(`memory:${id}`, entry)
// 5. Append id to index: get('memory:__index') → push id → set
// 6. return id

export async function search(query, topK = 5)
// 1. queryVec = await embed(query)
// 2. index = await get('memory:__index') || []
// 3. For each id in index: entry = await get(`memory:${id}`)
// 4. score = cosineSimilarity(queryVec, entry.vector)
// 5. Sort by score desc, return top topK entries as { id, text, metadata, score }

export async function remove(id)
// 1. await del(`memory:${id}`)
// 2. Remove id from index list → set('memory:__index', filtered)
```

## Internal Helper

```javascript
function cosineSimilarity(a, b) {
  // dot(a,b) / (||a|| * ||b||)
  // Returns -1 to 1, higher = more similar
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
```

## Data Structure (stored in agentic-store)

```javascript
// Key: "memory:{uuid}"
// Value:
{
  id: string,           // crypto.randomUUID()
  text: string,         // original text
  vector: number[],     // embedding from embed()
  metadata: object,     // caller-provided metadata
  createdAt: number     // Date.now()
}

// Key: "memory:__index"
// Value: string[]       // array of memory entry IDs
```

## Error Handling

- `add('')` → embed returns `[]` → store entry with empty vector (search won't match well, but no crash)
- `add(non-string)` → embed throws TypeError → propagate to caller
- `search()` with empty index → return `[]`
- `remove(nonexistent)` → del is no-op, filter index (safe)
- Store unavailable → propagate agentic-store error

## Step-by-step Implementation

1. Create `src/runtime/memory.js`
2. Import `{ get, set, del }` from `'../store/index.js'`
3. Import `{ embed }` from `'./embed.js'`
4. Implement `cosineSimilarity(a, b)` helper (not exported)
5. Implement `add(text, metadata)` — embed + store + update index
6. Implement `search(query, topK)` — embed query + scan index + rank by cosine similarity
7. Implement `remove(id)` — delete entry + update index

## Test Cases

1. `add('hello world')` → returns UUID string, `get('memory:__index')` contains it
2. `search('hello')` → returns array with the added entry, score > 0
3. `search('hello', 1)` → returns exactly 1 result
4. `remove(id)` → subsequent `search` does not return it
5. `search('anything')` on empty store → returns `[]`
6. `add(123)` → throws TypeError (from embed)

## Performance Considerations

- Linear scan over all entries for search — O(n) where n = total memories
- Acceptable for small-to-medium stores (< 10K entries)
- For larger scale, would need a proper vector index (out of scope for this task)

## ⚠️ Unverified Assumptions

- `localEmbed` from agentic-embed produces normalized vectors (cosine similarity assumes this for meaningful scores). If not normalized, results are still valid but scores may not be in [-1, 1] range.
- `crypto.randomUUID()` available in Node.js ≥ 19 (project requires ≥ 18, so may need `crypto.randomUUID?.() || Date.now().toString(36)` fallback)
