import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/store/index.js', () => {
  let data = {}
  return {
    get: vi.fn(async (key) => data[key] ?? null),
    set: vi.fn(async (key, value) => { data[key] = value }),
    del: vi.fn(async (key) => { delete data[key] }),
    _reset: () => { data = {} }
  }
})

vi.mock('../../src/runtime/embed.js', () => ({
  embed: vi.fn(async (text) => {
    if (typeof text !== 'string') throw new TypeError('text must be a string')
    if (text === '') return []
    const seed = [...text].reduce((s, c) => s + c.charCodeAt(0), 0)
    return [Math.sin(seed), Math.cos(seed), Math.sin(seed * 2)]
  })
}))

const { add, search, remove, clear } = await import('../../src/runtime/memory.js')
const store = await import('../../src/store/index.js')

describe('runtime/memory.js', () => {
  beforeEach(() => {
    store._reset()
    vi.clearAllMocks()
  })

  describe('add()', () => {
    it('stores text with embedding vector and returns id', async () => {
      const id = await add('hello world')
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
      const entry = await store.get(`memory:${id}`)
      expect(entry.text).toBe('hello world')
      expect(entry.vector).toBeInstanceOf(Array)
      expect(entry.vector.length).toBe(3)
      expect(entry.createdAt).toBeDefined()
    })

    it('stores metadata in entry', async () => {
      const id = await add('test', { source: 'chat' })
      const entry = await store.get(`memory:${id}`)
      expect(entry.text).toBe('test')
      expect(entry.metadata).toEqual({ source: 'chat' })
    })

    it('defaults metadata to empty object', async () => {
      const id = await add('no meta')
      const entry = await store.get(`memory:${id}`)
      expect(entry.metadata).toEqual({})
    })

    it('propagates TypeError for non-string input', async () => {
      await expect(add(123)).rejects.toThrow(TypeError)
    })

    it('appends id to index', async () => {
      const id1 = await add('first')
      const id2 = await add('second')
      const index = await store.get('memory:__index')
      expect(index).toEqual([id1, id2])
    })

    it('handles empty string input without crashing', async () => {
      const id = await add('')
      expect(typeof id).toBe('string')
      const entry = await store.get(`memory:${id}`)
      expect(entry.text).toBe('')
      expect(entry.vector).toEqual([])
    })
  })

  describe('search()', () => {
    it('returns empty array when no entries', async () => {
      const results = await search('anything')
      expect(results).toEqual([])
    })

    it('returns scored results sorted by similarity', async () => {
      await add('cats are great')
      await add('dogs are fun')
      await add('cats are wonderful')
      const results = await search('cats')
      expect(results.length).toBeLessThanOrEqual(5)
      expect(results[0]).toHaveProperty('id')
      expect(results[0]).toHaveProperty('text')
      expect(results[0]).toHaveProperty('score')
      expect(results[0]).toHaveProperty('metadata')
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })

    it('respects topK parameter', async () => {
      await add('a')
      await add('b')
      await add('c')
      const results = await search('query', 2)
      expect(results).toHaveLength(2)
    })
  })

  describe('remove()', () => {
    it('removes entry and updates index', async () => {
      const id1 = await add('first')
      const id2 = await add('to remove')
      await remove(id2)
      expect(await store.get(`memory:${id2}`)).toBeNull()
      const index = await store.get('memory:__index')
      expect(index).toEqual([id1])
    })
  })

  describe('clear()', () => {
    it('removes all entries and index', async () => {
      const id1 = await add('one')
      const id2 = await add('two')
      await clear()
      expect(await store.get(`memory:${id1}`)).toBeNull()
      expect(await store.get(`memory:${id2}`)).toBeNull()
      expect(await store.get('memory:__index')).toBeNull()
    })
  })
})
