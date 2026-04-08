import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

// DBB-013: custom provider is used
describe('DBB-013: custom provider', () => {
  it('uses customProvider.chat() when provider="custom"', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('custom-result'))
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: [],
    }
    const result = await ask('hello', config)
    expect(chat).toHaveBeenCalledTimes(1)
    expect(result.answer).toBe('custom-result')
  })

  it('throws when provider="custom" but no customProvider', async () => {
    const config: AgenticConfig = { provider: 'custom', apiKey: 'test', tools: [] }
    await expect(ask('hello', config)).rejects.toThrow('customProvider')
  })
})
