import { describe, it, expect } from 'vitest'
import { createProvider } from 'agentic-core'

describe('custom provider apiKey skip', () => {
  it('does not throw with only baseUrl (no apiKey)', () => {
    expect(() => createProvider({ provider: 'custom', baseUrl: 'http://localhost:11434', tools: [] })).not.toThrow()
  })

  it('throws when neither baseUrl nor customProvider', () => {
    expect(() => createProvider({ provider: 'custom', tools: [] })).toThrow('customProvider or baseUrl is required')
  })

  it('returns customProvider when provided', () => {
    const mock = { chat: async () => ({ text: '', toolCalls: [], usage: { input: 0, output: 0 }, stopReason: 'end' as const }) }
    expect(createProvider({ provider: 'custom', customProvider: mock, tools: [] })).toBe(mock)
  })
})
