import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createMemory,
  createManager,
  createKnowledgeStore,
  estimateTokens,
  chunkText,
  cosineSimilarity,
  localEmbed,
} from '../agentic-memory.js'

describe('AgenticMemory', () => {
  describe('createMemory', () => {
    it('should create memory instance with default config', () => {
      const mem = createMemory()
      expect(mem).toBeDefined()
      expect(mem.add).toBeInstanceOf(Function)
      expect(mem.messages).toBeInstanceOf(Function)
      expect(mem.history).toBeInstanceOf(Function)
      expect(mem.info).toBeInstanceOf(Function)
      expect(mem.clear).toBeInstanceOf(Function)
    })

    it('should accept custom config', () => {
      const mem = createMemory({
        maxTokens: 4000,
        systemPrompt: 'You are helpful.',
        storage: 'memory'
      })
      expect(mem).toBeDefined()
    })

    it('should add messages', async () => {
      const mem = createMemory()
      await mem.add('user', 'Hello')
      await mem.add('assistant', 'Hi there!')
      const msgs = mem.history()
      expect(msgs).toHaveLength(2)
      expect(msgs[0].role).toBe('user')
      expect(msgs[0].content).toBe('Hello')
      expect(msgs[1].role).toBe('assistant')
      expect(msgs[1].content).toBe('Hi there!')
    })

    it('should return messages array', async () => {
      const mem = createMemory()
      await mem.add('user', 'Test')
      const msgs = mem.messages()
      expect(Array.isArray(msgs)).toBe(true)
      expect(msgs.length).toBeGreaterThanOrEqual(1)
      const userMsg = msgs.find(m => m.role === 'user')
      expect(userMsg).toBeDefined()
      expect(userMsg.content).toBe('Test')
    })

    it('should separate history and messages with system prompt', async () => {
      const mem = createMemory({ systemPrompt: 'You are a helpful bot.' })
      await mem.add('user', 'Hello')
      
      const history = mem.history()
      expect(history.some(m => m.role === 'system')).toBe(false)
      expect(history).toHaveLength(1)
      
      const messages = mem.messages()
      expect(messages.some(m => m.role === 'system')).toBe(true)
      expect(messages[0].content).toBe('You are a helpful bot.')
    })

    it('should provide info with turns/tokens/messageCount', async () => {
      const mem = createMemory()
      await mem.add('user', 'Hello')
      await mem.add('assistant', 'World')
      
      const info = mem.info()
      expect(typeof info.turns).toBe('number')
      expect(info.turns).toBe(1)
      expect(typeof info.tokens).toBe('number')
      expect(info.tokens).toBeGreaterThan(0)
      expect(info.messageCount).toBe(2)
    })

    it('should auto-trim when exceeding maxTokens', async () => {
      const mem = createMemory({ maxTokens: 50 })
      for (let i = 0; i < 30; i++) {
        await mem.add('user', `This is a longer message number ${i} with some extra content to fill tokens`)
        await mem.add('assistant', `Response to message ${i} with some additional details and information`)
      }
      const info = mem.info()
      expect(info.tokens <= 50 || info.messageCount <= 2).toBe(true)
    })

    it('should clear all messages', async () => {
      const mem = createMemory()
      await mem.add('user', 'Hello')
      await mem.add('assistant', 'World')
      mem.clear()
      const info = mem.info()
      expect(info.messageCount).toBe(0)
      expect(info.turns).toBe(0)
    })
  })

  describe('Knowledge Store', () => {
    it('should create knowledge store instance', () => {
      const ks = createKnowledgeStore()
      expect(ks).toBeDefined()
      expect(ks.add).toBeInstanceOf(Function)
      expect(ks.search).toBeInstanceOf(Function)
      expect(ks.remove).toBeInstanceOf(Function)
    })

    it('should learn and store documents', async () => {
      const mem = createMemory({ knowledge: true })
      await mem.learn('doc-1', 'Quantum computing uses qubits for parallel computation')
      const ki = mem.knowledgeInfo()
      expect(ki.size).toBe(1)
      expect(ki.ids).toContain('doc-1')
    })

    it('should recall relevant documents', async () => {
      const mem = createMemory({ knowledge: true })
      await mem.learn('doc-1', 'Quantum computing uses qubits for parallel computation')
      await mem.learn('doc-2', 'Classical music evolved through the Baroque and Romantic periods')
      
      const results = await mem.recall('How do qubits work?')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].id).toBe('doc-1')
      expect(results[0].score).toBeGreaterThan(0)
    })

    it('should forget documents', async () => {
      const mem = createMemory({ knowledge: true })
      await mem.learn('doc-1', 'First document')
      await mem.learn('doc-2', 'Second document')
      
      await mem.forget('doc-1')
      const ki = mem.knowledgeInfo()
      expect(ki.size).toBe(1)
      expect(ki.ids).not.toContain('doc-1')
      expect(ki.ids).toContain('doc-2')
    })

    it('should return null knowledgeInfo when knowledge disabled', () => {
      const mem = createMemory({ knowledge: false })
      expect(mem.knowledgeInfo()).toBeNull()
    })
  })

  describe('Utility Functions', () => {
    describe('estimateTokens', () => {
      it('should estimate token count for English text', () => {
        const tokens = estimateTokens('Hello world')
        expect(typeof tokens).toBe('number')
        expect(tokens).toBeGreaterThan(0)
      })

      it('should estimate token count for Chinese text', () => {
        const cnTokens = estimateTokens('你好世界')
        expect(cnTokens).toBeGreaterThan(0)
      })

      it('should return 0 for empty text', () => {
        expect(estimateTokens('')).toBe(0)
        expect(estimateTokens(null)).toBe(0)
      })
    })

    describe('chunkText', () => {
      it('should return single chunk for short text', () => {
        const chunks = chunkText('short text')
        expect(chunks).toHaveLength(1)
        expect(chunks[0]).toBe('short text')
      })

      it('should split long text into chunks', () => {
        const longText = Array(20).fill('This is a sentence that should be chunked.').join('\n\n')
        const chunks = chunkText(longText, { maxChunkSize: 100 })
        expect(Array.isArray(chunks)).toBe(true)
        expect(chunks.length).toBeGreaterThan(1)
        for (const chunk of chunks) {
          expect(chunk.length).toBeGreaterThan(0)
        }
      })

      it('should handle custom separator', () => {
        const text = 'Part 1. Part 2. Part 3.'
        const chunks = chunkText(text, { separator: '. ', maxChunkSize: 10 })
        expect(chunks.length).toBeGreaterThan(1)
      })

      it('should handle empty text', () => {
        const chunks = chunkText('')
        expect(chunks).toEqual([''])
      })
    })

    describe('cosineSimilarity', () => {
      it('should return 1 for identical vectors', () => {
        const sim = cosineSimilarity([1, 0, 0], [1, 0, 0])
        expect(Math.abs(sim - 1)).toBeLessThan(0.001)
      })

      it('should return 0 for orthogonal vectors', () => {
        const sim = cosineSimilarity([1, 0, 0], [0, 1, 0])
        expect(Math.abs(sim)).toBeLessThan(0.001)
      })

      it('should return -1 for opposite vectors', () => {
        const sim = cosineSimilarity([1, 0], [-1, 0])
        expect(Math.abs(sim - (-1))).toBeLessThan(0.001)
      })

      it('should return 0 for zero vector', () => {
        const sim = cosineSimilarity([0, 0], [1, 1])
        expect(sim).toBe(0)
      })
    })

    describe('localEmbed', () => {
      it('should return embeddings for texts', () => {
        const texts = ['Hello world', 'Goodbye world', 'Quantum computing']
        const embeddings = localEmbed(texts)
        
        expect(Array.isArray(embeddings)).toBe(true)
        expect(embeddings).toHaveLength(3)
        
        for (const emb of embeddings) {
          expect(Array.isArray(emb) || emb instanceof Float32Array).toBe(true)
          expect(emb.length).toBeGreaterThan(0)
        }
      })

      it('should produce similar embeddings for similar texts', () => {
        const texts = ['Hello world', 'Goodbye world', 'Quantum computing']
        const embeddings = localEmbed(texts)
        
        const sim_similar = cosineSimilarity(embeddings[0], embeddings[1])
        const sim_different = cosineSimilarity(embeddings[0], embeddings[2])
        
        expect(sim_similar).toBeGreaterThan(sim_different)
      })
    })
  })

  describe('createManager', () => {
    it('should create manager instance', () => {
      const manager = createManager()
      expect(manager).toBeDefined()
      expect(manager.get).toBeInstanceOf(Function)
      expect(manager.list).toBeInstanceOf(Function)
      expect(manager.delete).toBeInstanceOf(Function)
      expect(manager.clear).toBeInstanceOf(Function)
    })

    it('should get or create sessions', () => {
      const manager = createManager()
      const mem1 = manager.get('session-1')
      const mem2 = manager.get('session-1')
      expect(mem1).toBe(mem2)
    })

    it('should list session ids', () => {
      const manager = createManager()
      manager.get('alice')
      manager.get('bob')
      const ids = manager.list()
      expect(ids).toContain('alice')
      expect(ids).toContain('bob')
    })

    it('should delete sessions', () => {
      const manager = createManager()
      const mem = manager.get('temp')
      expect(mem).toBeDefined()
      manager.delete('temp')
      const ids = manager.list()
      expect(ids).not.toContain('temp')
    })
  })
})
