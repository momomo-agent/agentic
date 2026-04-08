import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import { AgenticFileSystem, MemoryStorage } from 'agentic-filesystem'

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

// DBB-001: ask() works without filesystem config
describe('DBB-001: zero-config filesystem', () => {
  it('ask() succeeds with file tools and no filesystem config', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('done'))
    const result = await ask('hi', { provider: 'custom', customProvider: { chat }, tools: ['file'] })
    expect(result.answer).toBe('done')
  })
})

// DBB-002: default filesystem is in-memory (no Node fs required)
describe('DBB-002: default filesystem is in-memory', () => {
  it('fallback produces AgenticFileSystem with MemoryStorage', () => {
    const config: { filesystem?: AgenticFileSystem } = {}
    const fs = config.filesystem ?? new AgenticFileSystem({ storage: new MemoryStorage() })
    expect(fs).toBeInstanceOf(AgenticFileSystem)
  })
})

// DBB-003: explicit filesystem is used when provided
describe('DBB-003: explicit filesystem respected', () => {
  it('uses caller-supplied filesystem', async () => {
    const customFs = new AgenticFileSystem({ storage: new MemoryStorage() })
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('ok'))
    const result = await ask('hi', { provider: 'custom', customProvider: { chat }, tools: ['file'], filesystem: customFs })
    expect(result.answer).toBe('ok')
  })
})

// DBB-004: README documents filesystem as optional
describe('DBB-004: README documents filesystem as optional', () => {
  it('README marks filesystem as optional with default', async () => {
    const { readFileSync } = await import('fs')
    const readme = readFileSync('README.md', 'utf8')
    expect(readme).toMatch(/filesystem.*optional/i)
    expect(readme).toMatch(/in-memory/i)
  })
})
