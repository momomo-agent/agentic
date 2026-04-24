import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as AgenticEmbed from '../src/index.js'

describe('AgenticEmbed', () => {
  let store

  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const chunks = AgenticEmbed.chunkText('Short text')
      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toBe('Short text')
    })

    it('should split text with paragraph boundaries', () => {
      const text = Array(10).fill('This is a paragraph with enough text.').join('\n\n')
      const chunks = AgenticEmbed.chunkText(text, { maxChunkSize: 100, overlap: 20 })
      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should split text with sentence boundaries', () => {
      const text = Array(20).fill('This is a sentence.').join(' ')
      const chunks = AgenticEmbed.chunkText(text, { maxChunkSize: 80, overlap: 10 })
      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should handle custom separator', () => {
      const text = 'Part 1. Part 2. Part 3. Part 4. Part 5.'
      const chunks = AgenticEmbed.chunkText(text, { separator: '. ', maxChunkSize: 15 })
      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should handle empty text', () => {
      const chunks = AgenticEmbed.chunkText('')
      expect(chunks).toEqual([''])
    })

    it('should not split text shorter than maxChunkSize', () => {
      const chunks = AgenticEmbed.chunkText('hello', { maxChunkSize: 500 })
      expect(chunks).toHaveLength(1)
    })
  })

  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const v = [1, 0, 0]
      expect(AgenticEmbed.cosineSimilarity(v, v)).toBeCloseTo(1)
    })

    it('should return 0 for orthogonal vectors', () => {
      expect(AgenticEmbed.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
    })
  })

  describe('localEmbed', () => {
    it('should return embeddings for texts', () => {
      const embeddings = AgenticEmbed.localEmbed(['hello world', 'test'])
      expect(embeddings).toHaveLength(2)
      expect(embeddings[0]).toBeInstanceOf(Array)
      expect(embeddings[0].length).toBeGreaterThan(0)
    })
  })

  describe('create', () => {
    it('should create store with default config', () => {
      store = AgenticEmbed.create({ apiKey: 'test-key' })
      expect(store).toBeDefined()
      expect(store.add).toBeInstanceOf(Function)
      expect(store.search).toBeInstanceOf(Function)
    })

    it('should create local store without apiKey', () => {
      store = AgenticEmbed.create({ provider: 'local' })
      expect(store).toBeDefined()
    })

    it('should have size and chunkCount getters', () => {
      store = AgenticEmbed.create({ provider: 'local' })
      expect(store.size).toBe(0)
      expect(store.chunkCount).toBe(0)
    })
  })

  describe('local provider operations', () => {
    beforeEach(() => {
      store = AgenticEmbed.create({ provider: 'local' })
    })

    it('should add and search documents', async () => {
      await store.add('doc-1', 'Quantum computing uses qubits for parallel processing')
      await store.add('doc-2', 'Neural networks learn patterns from training data')
      expect(store.size).toBe(2)

      const results = await store.search('quantum computing')
      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('score')
    })

    it('should remove documents', async () => {
      await store.add('doc-1', 'Test content')
      expect(store.size).toBe(1)
      store.remove('doc-1')
      expect(store.size).toBe(0)
    })

    it('should clear all documents', async () => {
      await store.add('doc-1', 'Content 1')
      await store.add('doc-2', 'Content 2')
      store.clear()
      expect(store.size).toBe(0)
    })

    it('should list document ids', async () => {
      await store.add('doc-1', 'Content 1')
      await store.add('doc-2', 'Content 2')
      expect(store.ids()).toEqual(expect.arrayContaining(['doc-1', 'doc-2']))
    })

    it('should export store state', async () => {
      await store.add('doc-1', 'Content')
      const exported = store.export()
      expect(exported).toHaveProperty('entries')
      expect(exported).toHaveProperty('provider', 'local')
      expect(exported.entries.length).toBeGreaterThan(0)
    })

    it('should respect topK in search', async () => {
      await store.add('doc-1', 'Alpha content')
      await store.add('doc-2', 'Beta content')
      await store.add('doc-3', 'Gamma content')
      const results = await store.search('content', { topK: 1 })
      expect(results.length).toBeLessThanOrEqual(1)
    })

    it('should return empty array when searching empty store', async () => {
      const results = await store.search('anything')
      expect(results).toEqual([])
    })
  })
})
