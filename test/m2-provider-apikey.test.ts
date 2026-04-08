import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

// DBB-014: throws on missing apiKey
describe('DBB-014: missing apiKey', () => {
  it('throws before any network call when apiKey is absent', async () => {
    const config = { tools: [] } as unknown as AgenticConfig
    await expect(ask('hi', config)).rejects.toThrow(/apiKey/)
  })
})

// DBB-015: throws on empty string apiKey
describe('DBB-015: empty apiKey', () => {
  it('throws when apiKey is empty string', async () => {
    const config: AgenticConfig = { apiKey: '', tools: [] }
    await expect(ask('hi', config)).rejects.toThrow(/apiKey/)
  })
})

// DBB-016: succeeds with valid apiKey (custom provider, no network)
describe('DBB-016: valid apiKey proceeds', () => {
  it('does not throw provider error with valid apiKey', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('ok'))
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'sk-valid',
      tools: [],
    }
    const result = await ask('hi', config)
    expect(result.answer).toBe('ok')
  })
})
