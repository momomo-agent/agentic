# Task Design: Implement Concrete EmbedBackend

## File to Create
`src/backends/tfidf-embed.ts`

## File to Modify
`src/index.ts` — add `export { TfIdfEmbedBackend } from './backends/tfidf-embed.js'`

## Class Signature
```ts
export class TfIdfEmbedBackend implements EmbedBackend {
  private vocab: string[]           // sorted unique terms
  private docs: Map<string, number[]>  // path → tfidf vector

  async index(storage: StorageBackend): Promise<void>
  async encode(text: string): Promise<number[]>
  async search(embedding: number[], topK?: number): Promise<Array<{ path: string; score: number }>>
}
```

## Algorithm

### `index(storage)`
1. `paths = await storage.list()`
2. For each path, `content = await storage.get(path)`
3. Tokenize: `text.toLowerCase().split(/\W+/).filter(Boolean)`
4. Build global vocab from all tokens (sorted, deduplicated)
5. Compute TF-IDF vector per doc, store in `this.docs`

### `encode(text)`
- Tokenize text same way as index
- Return TF vector over `this.vocab` (term frequency, normalized)

### `search(embedding, topK=5)`
- Compute cosine similarity between `embedding` and each doc vector
- Return top-K results sorted by score descending

### Cosine similarity helper (private)
```ts
private cosine(a: number[], b: number[]): number
// dot(a,b) / (norm(a) * norm(b)), returns 0 if either norm is 0
```

## Edge Cases
- Empty storage: `index()` sets empty vocab/docs, `search()` returns `[]`
- Zero-norm vector: `cosine()` returns 0
- `topK` larger than doc count: return all docs

## Dependencies
- `../types.js` — `EmbedBackend`, `StorageBackend`

## Test Cases
- After `index()`, `encode('hello')` returns array of length `vocab.size`
- `search()` returns at most `topK` results
- Doc containing query terms scores higher than unrelated doc
- `search()` on empty index returns `[]`
