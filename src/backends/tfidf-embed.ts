// tfidf-embed.ts — TF-IDF based embedding backend for semantic search

import type { EmbedBackend, StorageBackend } from '../types.js'

export class TfIdfEmbedBackend implements EmbedBackend {
  private vocab: string[] = []
  private docs: Map<string, number[]> = new Map()
  private idf: Map<string, number> = new Map()

  /**
   * Build TF-IDF index from all documents in storage.
   */
  async index(storage: StorageBackend): Promise<void> {
    const paths = await storage.list()

    if (paths.length === 0) {
      this.vocab = []
      this.docs.clear()
      this.idf.clear()
      return
    }

    // Step 1: Tokenize all documents and build vocabulary
    const docTokens = new Map<string, string[]>()
    const termDocCount = new Map<string, number>()

    for (const path of paths) {
      const content = await storage.get(path)
      if (!content) continue

      const tokens = this.tokenize(content)
      docTokens.set(path, tokens)

      // Count documents containing each term (for IDF)
      const uniqueTerms = new Set(tokens)
      for (const term of uniqueTerms) {
        termDocCount.set(term, (termDocCount.get(term) || 0) + 1)
      }
    }

    // Build sorted vocabulary
    this.vocab = Array.from(termDocCount.keys()).sort()

    // Step 2: Compute IDF for each term
    const numDocs = docTokens.size
    for (const term of this.vocab) {
      const docFreq = termDocCount.get(term) || 0
      this.idf.set(term, Math.log(numDocs / docFreq))
    }

    // Step 3: Compute TF-IDF vectors for each document
    for (const [path, tokens] of docTokens) {
      const vector = this.computeTfIdf(tokens)
      this.docs.set(path, vector)
    }
  }

  /**
   * Encode text into a TF vector over the vocabulary.
   */
  async encode(text: string): Promise<number[]> {
    const tokens = this.tokenize(text)
    return this.computeTf(tokens)
  }

  /**
   * Search for documents similar to the given embedding.
   */
  async search(
    embedding: number[],
    topK: number = 5
  ): Promise<Array<{ path: string; score: number }>> {
    if (this.docs.size === 0) {
      return []
    }

    const results: Array<{ path: string; score: number }> = []

    for (const [path, docVector] of this.docs) {
      const score = this.cosine(embedding, docVector)
      results.push({ path, score })
    }

    // Sort by score descending and return top-K
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, topK)
  }

  /**
   * Tokenize text into lowercase words.
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(Boolean)
  }

  /**
   * Compute term frequency vector (normalized).
   */
  private computeTf(tokens: string[]): number[] {
    const termCount = new Map<string, number>()

    for (const token of tokens) {
      termCount.set(token, (termCount.get(token) || 0) + 1)
    }

    const vector = new Array(this.vocab.length).fill(0)
    const totalTerms = tokens.length || 1

    for (let i = 0; i < this.vocab.length; i++) {
      const term = this.vocab[i]
      const count = termCount.get(term) || 0
      vector[i] = count / totalTerms
    }

    return vector
  }

  /**
   * Compute TF-IDF vector for a document.
   */
  private computeTfIdf(tokens: string[]): number[] {
    const tf = this.computeTf(tokens)
    const tfidf = new Array(this.vocab.length)

    for (let i = 0; i < this.vocab.length; i++) {
      const term = this.vocab[i]
      const idfValue = this.idf.get(term) || 0
      tfidf[i] = tf[i] * idfValue
    }

    return tfidf
  }

  /**
   * Compute cosine similarity between two vectors.
   */
  private cosine(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    normA = Math.sqrt(normA)
    normB = Math.sqrt(normB)

    if (normA === 0 || normB === 0) return 0

    return dotProduct / (normA * normB)
  }
}
