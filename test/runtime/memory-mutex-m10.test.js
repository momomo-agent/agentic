import { describe, it, expect, vi, beforeEach } from 'vitest'

const store = new Map()
vi.mock('../../src/store/index.js', () => ({
  get: vi.fn(async (key) => store.get(key) ?? null),
  set: vi.fn(async (key, value) => store.set(key, value)),
  del: vi.fn(async (key) => store.delete(key))
}))
vi.mock('../../src/runtime/embed.js', () => ({
  embed: vi.fn(async () => [1, 0, 0])
}))

beforeEach(() => {
  store.clear()
  vi.resetModules()
})

describe('memory.js mutex — DBB-008', () => {
  it('concurrent 10 adds: INDEX_KEY contains exactly 10 entries', async () => {
    const { add } = await import('../../src/runtime/memory.js')
    await Promise.all(Array.from({ length: 10 }, (_, i) => add(`item ${i}`)))
    const index = store.get('mem:__index__')
    expect(Array.isArray(index)).toBe(true)
    expect(index.length).toBe(10)
  })

  it('no duplicate entries in INDEX_KEY after concurrent adds', async () => {
    const { add } = await import('../../src/runtime/memory.js')
    await Promise.all(Array.from({ length: 5 }, (_, i) => add(`item ${i}`)))
    const index = store.get('mem:__index__')
    expect(new Set(index).size).toBe(index.length)
  })

  it('sequential adds still work correctly', async () => {
    const { add } = await import('../../src/runtime/memory.js')
    await add('first')
    await add('second')
    const index = store.get('mem:__index__')
    expect(index.length).toBe(2)
  })
})
