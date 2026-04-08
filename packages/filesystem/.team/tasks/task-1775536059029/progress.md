# Implement concrete EmbedBackend

## Progress

### Implementation Complete

Created `src/backends/tfidf-embed.ts` with TfIdfEmbedBackend class that implements the EmbedBackend interface.

**Features Implemented:**
- **index(storage)**: Builds TF-IDF index from all documents in storage
  - Tokenizes all documents using lowercase + word splitting
  - Builds sorted vocabulary from all unique terms
  - Computes IDF (inverse document frequency) for each term
  - Stores TF-IDF vectors for each document

- **encode(text)**: Encodes query text into TF vector
  - Uses same tokenization as index
  - Returns normalized term frequency vector over vocabulary

- **search(embedding, topK)**: Finds similar documents
  - Computes cosine similarity between query and all documents
  - Returns top-K results sorted by score descending

**Edge Cases Handled:**
- Empty storage: Returns empty results
- Zero-norm vectors: Cosine returns 0
- topK larger than doc count: Returns all docs

**Export Added:**
- Added `export { TfIdfEmbedBackend } from './backends/tfidf-embed.js'` to src/index.ts

## Status: Ready for Review
