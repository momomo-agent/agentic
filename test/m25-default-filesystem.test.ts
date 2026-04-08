// Task task-1775581632597: Auto-instantiate default AgenticFileSystem
import { describe, it, expect } from 'vitest'
import { ask } from '../src/ask.js'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'

describe('m25 default filesystem', () => {
  it('ask() works with file tools and no filesystem config', async () => {
    const mockProvider = {
      chat: async () => ({ text: 'done', toolCalls: [], stopReason: 'end' as const, usage: { input: 1, output: 1 } }),
    }
    const result = await ask('test', {
      provider: 'custom',
      customProvider: mockProvider,
      tools: ['file_read'],
    })
    expect(result).toBeDefined()
    expect(result.answer).toBe('done')
  })

  it('ask() uses provided filesystem when given', async () => {
    const fs = new AgenticFileSystem({ storage: new MemoryStorage() })
    const mockProvider = {
      chat: async () => ({ text: 'ok', toolCalls: [], stopReason: 'end' as const, usage: { input: 1, output: 1 } }),
    }
    const result = await ask('test', {
      provider: 'custom',
      customProvider: mockProvider,
      filesystem: fs,
      tools: ['file_read'],
    })
    expect(result.answer).toBe('ok')
  })
})
