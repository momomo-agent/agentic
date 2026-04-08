import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

// DBB-001: custom provider works without apiKey
describe('DBB-001: custom provider no apiKey', () => {
  it('succeeds without apiKey when using custom provider', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('ok'))
    const config: AgenticConfig = { provider: 'custom', customProvider: { chat }, tools: [] }
    const result = await ask('hi', config)
    expect(result.answer).toBe('ok')
    expect(chat).toHaveBeenCalled()
  })
})

// DBB-002: anthropic throws without apiKey
describe('DBB-002: anthropic requires apiKey', () => {
  it('throws before network call when provider=anthropic and no apiKey', async () => {
    const config = { provider: 'anthropic', tools: [] } as unknown as AgenticConfig
    await expect(ask('hi', config)).rejects.toThrow(/apiKey/)
  })
})

// DBB-003: openai throws without apiKey
describe('DBB-003: openai requires apiKey', () => {
  it('throws before network call when provider=openai and no apiKey', async () => {
    const config = { provider: 'openai', tools: [] } as unknown as AgenticConfig
    await expect(ask('hi', config)).rejects.toThrow(/apiKey/)
  })
})
