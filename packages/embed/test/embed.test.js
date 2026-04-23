import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as AgenticEmbed from '../src/index.js'

describe('AgenticEmbed', () => {
  let store
  const mockApiKey = 'test-key'

  beforeEach(() => {
    // Mock fetch for embedding API
    global.fetch = vi.fn()
  })

  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const text = 'Short text'
      const chunks = AgenticEmbed.chunkText(text)
      expect(chunks).toHaveLength(1)
      expect(chunks[0]).toBe(text)
    })

    it('should split long text into chunks', () => {
      const text = 'a'.repeat(1000)
      const chunks = AgenticEmbed.chunkText(text, { maxChunkSize: 200, overlap: 20 })
      expect(chunks.length).toBeGreaterThan(1)
      expect(chunks[0].length).toBeLessThanOrEqual(200)
    })

    it('should handle custom separator', () => {
      const text = 'Part 1. Part 2. Part 3.'
      const chunks = AgenticEmbed.chunkText(text, { separator: '. ', maxChunkSize: 10 })
      expect(chunks.length).toBeGreaterThan(1)
    })

    it('should handle empty text', () => {
      const chunks = AgenticEmbed.chunkText('')
      expect(chunks).toEqual([''])
    })
  })

  describe('create', () => {
    it('should create store with default config', () => {
      store = AgenticEmbed.create({ apiKey: mockApiKey })
      expect(store).toBeDefined()
      expect(store.add).toBeInstanceOf(Function)
      expect(store.search).toBeInstanceOf(Function)
    })

    it('should accept custom config', () => {
      store = AgenticEmbed.create({
        apiKey: mockApiKey,
        model: 'custom-model',
        maxChunkSize: 300
      })
      expect(store).toBeDefined()
    })

    it('should throw without apiKey', () => {
      expect(() => AgenticEmbed.create()).toThrow()
    })
  })

  describe('add', () => {
    beforeEach(() => {
      store = AgenticEmbed.create({ apiKey: mockApiKey })
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: new Array(1536).fill(0.1) }] })
      })
    })

    it('should add document and return chunks', async () => {
      const result = await store.add('doc-1', 'Test document content')
      expect(result.chunks).toBeGreaterThan(0)
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle long documents with chunking', async () => {
      const longText = 'word '.repeat(200)
      const result = await store.add('doc-2', longText)
      expect(result.chunks).toBeGreaterThan(1)
    })

    it('should throw on API error', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      })
      await expect(store.add('doc-3', 'text')).rejects.toThrow()
    })
  })

  describe('search', () => {
    beforeEach(async () => {
      store = AgenticEmbed.create({ apiKey: mockApiKey })
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: new Array(1536).fill(0.1) }] })
      })
      await store.add('doc-1', 'Quantum computing uses qubits')
      await store.add('doc-2', 'Neural networks learn patterns')
    })

    it('should return search results', async () => {
      const results = await store.search('quantum', { topK: 2 })
      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeLessThanOrEqual(2)
    })

    it('should return results with scores', async () => {
      const results = await store.search('computing')
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('score')
      expect(results[0]).toHaveProperty('text')
    })

    it('should handle empty query', async () => {
      await expect(store.search('')).rejects.toThrow()
    })

    it('should respect topK limit', async () => {
      const results = await store.search('test', { topK: 1 })
      expect(results.length).toBeLessThanOrEqual(1)
    })
  })

  describe('delete', () => {
    beforeEach(async () => {
      store = AgenticEmbed.create({ apiKey: mockApiKey })
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: new Array(1536).fill(0.1) }] })
      })
      await store.add('doc-1', 'Test content')
    })

    it('should delete document by id', () => {
      const deleted = store.delete('doc-1')
      expect(deleted).toBe(true)
    })

    it('should return false for non-existent id', () => {
      const deleted = store.delete('non-existent')
      expect(deleted).toBe(false)
    })
  })

  describe('clear', () => {
    beforeEach(async () => {
      store = AgenticEmbed.create({ apiKey: mockApiKey })
      global.fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ embedding: new Array(1536).fill(0.1) }] })
      })
      await store.add('doc-1', 'Content 1')
      await store.add('doc-2', 'Content 2')
    })

    it('should clear all documents', () => {
      store.clear()
      const results = store.search('test')
      expect(results).resolves.toEqual([])
    })
  })
})
