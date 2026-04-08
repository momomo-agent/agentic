import { describe, it, expect, vi } from 'vitest'
import { createProvider } from 'agentic-core'
import { ask } from '../src/ask.js'

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

// DBB-005: provider='custom' + customProvider skips apiKey validation
describe('DBB-005: custom provider skips apiKey', () => {
  it('succeeds with customProvider and no apiKey', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('ok'))
    const result = await ask('hi', { provider: 'custom', customProvider: { chat }, tools: [] })
    expect(result.answer).toBe('ok')
  })

  // BUG: createOpenAIProvider throws 'apiKey is required for openai provider'
  // even when provider='custom' and only baseUrl is set.
  // provider.ts:46 skips apiKey check for custom, but createOpenAIProvider:7 still throws.
  it('does not throw with provider=custom, baseUrl, no apiKey', () => {
    expect(() => createProvider({ provider: 'custom', baseUrl: 'http://localhost:11434', tools: [] })).not.toThrow()
  })
})

// DBB-006: anthropic/openai still require apiKey
describe('DBB-006: anthropic/openai require apiKey', () => {
  it('throws for anthropic without apiKey', async () => {
    await expect(ask('hi', { provider: 'anthropic', tools: [] } as never)).rejects.toThrow(/apiKey/)
  })

  it('throws for openai without apiKey', async () => {
    await expect(ask('hi', { provider: 'openai', tools: [] } as never)).rejects.toThrow(/apiKey/)
  })
})
