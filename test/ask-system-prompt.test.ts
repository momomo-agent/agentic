import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

// DBB-005: ask() accepts systemPrompt and passes it to provider
describe('DBB-005: systemPrompt passed to provider', () => {
  it('chat() receives systemPrompt as third argument', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('ok'))
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: [],
      systemPrompt: 'You are a pirate.',
    }
    const result = await ask('hello', config)
    expect(result.answer).toBe('ok')
    expect(chat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      'You are a pirate.',
    )
  })
})

// DBB-006: ask() works without systemPrompt
describe('DBB-006: ask() works without systemPrompt', () => {
  it('completes normally when systemPrompt is omitted', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('done'))
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: [],
    }
    const result = await ask('hello', config)
    expect(result.answer).toBe('done')
  })
})
