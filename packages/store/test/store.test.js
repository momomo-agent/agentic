import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStore } from '../src/index.js'

describe('AgenticStore', () => {
  describe('mem backend', () => {
    let store

    beforeEach(async () => {
      store = await createStore('test-mem', { backend: 'mem' })
    })

    afterEach(async () => {
      await store?.close()
    })

    it('should create mem store', () => {
      expect(store.backend).toBe('mem')
    })

    it('should set and get values', async () => {
      await store.set('key1', { data: 'value1' })
      const result = await store.get('key1')
      expect(result.data).toBe('value1')
    })

    it('should return undefined for missing keys', async () => {
      const result = await store.get('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should check key existence', async () => {
      await store.set('key2', 'value2')
      expect(await store.has('key2')).toBe(true)
      expect(await store.has('missing')).toBe(false)
    })

    it('should delete keys', async () => {
      await store.set('key3', 'value3')
      await store.delete('key3')
      expect(await store.has('key3')).toBe(false)
    })

    it('should list all keys', async () => {
      await store.set('a', 1)
      await store.set('b', 2)
      await store.set('c', 3)
      const keys = await store.keys()
      expect(keys).toHaveLength(3)
      expect(keys).toContain('a')
      expect(keys).toContain('b')
      expect(keys).toContain('c')
    })

    it('should clear all data', async () => {
      await store.set('x', 1)
      await store.set('y', 2)
      await store.clear()
      const keys = await store.keys()
      expect(keys).toHaveLength(0)
    })

    it('should handle complex objects', async () => {
      const obj = { nested: { array: [1, 2, 3], bool: true } }
      await store.set('complex', obj)
      const result = await store.get('complex')
      expect(result).toEqual(obj)
    })

    it('should overwrite existing keys', async () => {
      await store.set('k', 'v1')
      await store.set('k', 'v2')
      expect(await store.get('k')).toBe('v2')
    })

    it('should handle string values', async () => {
      await store.set('str', 'hello')
      expect(await store.get('str')).toBe('hello')
    })
  })

  describe('sqlite-memory backend', () => {
    let store
    let hasSqlite = true

    beforeEach(async () => {
      try {
        store = await createStore('test-sqlite-mem', { backend: 'sqlite-memory' })
      } catch {
        hasSqlite = false
      }
    })

    afterEach(async () => {
      await store?.close()
    })

    it('should create sqlite-memory store (or skip)', async () => {
      if (!hasSqlite) return // no sqlite engine available
      expect(store.backend).toBe('sqlite-memory')
    })

    it('should set and get values (or skip)', async () => {
      if (!hasSqlite) return
      await store.set('key1', { data: 'value1' })
      const result = await store.get('key1')
      expect(result.data).toBe('value1')
    })

    it('should handle concurrent writes (or skip)', async () => {
      if (!hasSqlite) return
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(store.set(`key${i}`, `value${i}`))
      }
      await Promise.all(promises)
      const keys = await store.keys()
      expect(keys).toHaveLength(10)
    })
  })

  describe('error handling', () => {
    it('should throw on invalid backend', async () => {
      await expect(
        createStore('test', { backend: 'invalid' })
      ).rejects.toThrow()
    })
  })
})
