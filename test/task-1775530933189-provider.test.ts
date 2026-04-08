import { describe, it, expect } from 'vitest'
import { createProvider } from 'agentic-core'

// DBB-003: missing apiKey throws
describe('DBB-003: detectProvider throws on missing apiKey', () => {
  it('throws apiKey is required for anthropic without apiKey', () => {
    expect(() => createProvider({ provider: 'anthropic', apiKey: '' as any, tools: [] } as any))
      .toThrow(/apiKey is required/)
  })
})

// DBB-004: invalid apiKey format throws
describe('DBB-004: detectProvider throws on invalid apiKey format', () => {
  it('throws on bad anthropic key format', () => {
    expect(() => createProvider({ provider: 'anthropic', apiKey: 'bad-key', tools: [] } as any))
      .toThrow(/Invalid apiKey format/)
  })
  it('throws on bad openai key format', () => {
    expect(() => createProvider({ provider: 'openai', apiKey: 'bad-key', tools: [] } as any))
      .toThrow(/Invalid apiKey format/)
  })
})

// Design test cases from design.md
describe('custom provider createProvider', () => {
  it('throws baseUrl is required when provider=custom and no baseUrl', () => {
    expect(() => createProvider({ provider: 'custom', apiKey: 'key', tools: [] } as any))
      .toThrow('baseUrl is required when provider="custom"')
  })

  it('does not throw when provider=custom with baseUrl and no apiKey', () => {
    const provider = createProvider({ provider: 'custom', baseUrl: 'http://localhost:11434', tools: [] } as any)
    expect(provider).toHaveProperty('chat')
  })

  it('throws Unknown provider for unknown provider string', () => {
    expect(() => createProvider({ provider: 'foobar' as any, apiKey: 'k', tools: [] } as any))
      .toThrow('Unknown provider: foobar')
  })

  it('returns a provider when provider=custom with valid baseUrl and apiKey', () => {
    // createOpenAIProvider will be called — just verify no throw and returns object with chat
    const provider = createProvider({ provider: 'custom', baseUrl: 'https://proxy.example.com', apiKey: 'key', tools: [] } as any)
    expect(provider).toHaveProperty('chat')
    expect(typeof provider.chat).toBe('function')
  })
})
