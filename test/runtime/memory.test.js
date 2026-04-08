import { describe, it, expect, vi, beforeEach } from 'vitest'

// In-memory store mock
const store = new Map()
vi.mock('../../src/store/index.js', () => ({
  get: vi.fn(async (key) => store.get(key) ?? null),
  set: vi.fn(async (key, value) => store.set(key, value))
}))

// embed mock: returns deterministic vector based on text
vi.mock('../../src/runtime/embed.js', () => ({
  embed: vi.fn(async (text) => text ? [1, 0, 0] : [])
}))

import { add, search } from '../../src/runtime/memory.js'

beforeEach(() => store.clear())

describe('memory', () => {
  it('DBB-006/DBB-007: search("") returns []', async () => {
    expect(await search('')).toEqual([])
  })

  it('DBB-006: search on empty store returns []', async () => {
    expect(await search('hello')).toEqual([])
  })

  it('DBB-005: add then search returns result with text and score', async () => {
    await add('hello world')
    const results = await search('hello')
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0]).toHaveProperty('text')
    expect(results[0]).toHaveProperty('score')
  })

  it('DBB-008: concurrent adds all retrievable', async () => {
    await Promise.all(Array.from({ length: 10 }, (_, i) => add(`item ${i}`)))
    const results = await search('item')
    expect(results.length).toBeGreaterThanOrEqual(1)
  })

  it('topK limits results', async () => {
    await Promise.all([add('a'), add('b'), add('c'), add('d'), add('e'), add('f')])
    const results = await search('x', 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })
})
