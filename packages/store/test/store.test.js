import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createStore } from '../agentic-store.js'
import fs from 'fs'
import path from 'path'

describe('AgenticStore', () => {
  const testDbPath = path.join(process.cwd(), 'test-store.db')

  afterEach(() => {
    // Cleanup test db
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath)
    }
  })

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
  })

  describe('sqlite backend', () => {
    let store

    beforeEach(async () => {
      store = await createStore('test-sqlite', { 
        backend: 'sqlite',
        path: testDbPath
      })
    })

    afterEach(async () => {
      await store?.close()
    })

    it('should create sqlite store', () => {
      expect(store.backend).toBe('sqlite')
      expect(fs.existsSync(testDbPath)).toBe(true)
    })

    it('should persist data across instances', async () => {
      await store.set('persistent', 'data')
      await store.close()

      const store2 = await createStore('test-sqlite', {
        backend: 'sqlite',
        path: testDbPath
      })
      const result = await store2.get('persistent')
      expect(result).toBe('data')
      await store2.close()
    })

    it('should handle concurrent writes', async () => {
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(store.set(`key${i}`, `value${i}`))
      }
      await Promise.all(promises)
      const keys = await store.keys()
      expect(keys).toHaveLength(10)
    })

    it('should support transactions', async () => {
      await store.set('counter', 0)
      
      // Simulate concurrent increments
      const increments = []
      for (let i = 0; i < 5; i++) {
        increments.push((async () => {
          const val = await store.get('counter')
          await store.set('counter', val + 1)
        })())
      }
      await Promise.all(increments)
      
      const final = await store.get('counter')
      expect(final).toBeGreaterThan(0)
    })
  })

  describe('error handling', () => {
    it('should throw on invalid backend', async () => {
      await expect(
        createStore('test', { backend: 'invalid' })
      ).rejects.toThrow()
    })

    it('should handle invalid paths gracefully', async () => {
      await expect(
        createStore('test', { backend: 'sqlite', path: '/invalid/path/db.sqlite' })
      ).rejects.toThrow()
    })
  })
})
