import { describe, it, expect } from 'vitest'
import { executeFileRead, executeFileWrite } from '../src/tools/file.js'
import { AgenticFileSystem, AgenticStoreBackend } from 'agentic-filesystem'

function makeFs() {
  const map = new Map<string, string>()
  const store = {
    get: async (k: string) => map.get(k) ?? null,
    set: async (k: string, v: string) => { map.set(k, v) },
    delete: async (k: string) => { map.delete(k) },
    keys: async () => [...map.keys()],
  }
  return new AgenticFileSystem({ storage: new AgenticStoreBackend(store as any) })
}

describe('DBB-007: file_write then file_read', () => {
  it('returns written content', async () => {
    const fs = makeFs()
    await executeFileWrite({ path: 'test.txt', content: 'hello' }, fs)
    const result = await executeFileRead({ path: 'test.txt' }, fs)
    expect(result.content).toBe('hello')
  })
})

describe('DBB-008: file_read non-existent', () => {
  it('returns error string without throwing', async () => {
    const fs = makeFs()
    const result = await executeFileRead({ path: 'missing.txt' }, fs)
    expect(result.content).toMatch(/error/i)
  })
})
