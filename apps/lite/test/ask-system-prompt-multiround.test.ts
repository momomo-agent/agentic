import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'
import type { ProviderResponse } from 'agentic-core'

function toolUseResponse(id: string, name: string, input: Record<string, unknown>): ProviderResponse {
  return {
    text: '',
    stopReason: 'tool_use',
    toolCalls: [{ id, name, input }],
    rawContent: [{ type: 'tool_use', id, name, input }],
    usage: { input: 1, output: 1 },
  }
}

function finalResponse(text: string): ProviderResponse {
  return {
    text,
    stopReason: 'end',
    toolCalls: [],
    rawContent: [{ type: 'text', text }],
    usage: { input: 1, output: 1 },
  }
}

describe('DBB-006-multiround: systemPrompt passed on every tool round', () => {
  it('chat() receives systemPrompt on all 3 calls (2 tool rounds + final)', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce(toolUseResponse('t1', 'web_search', { query: 'q1' }))
      .mockResolvedValueOnce(toolUseResponse('t2', 'web_search', { query: 'q2' }))
      .mockResolvedValueOnce(finalResponse('done'))

    vi.mock('../src/tools/search.js', () => ({
      searchToolDef: { name: 'web_search', description: '', parameters: {} },
      executeSearch: vi.fn().mockResolvedValue({ text: 'r', sources: [], images: [] }),
    }))

    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: ['search'],
      toolConfig: { search: { apiKey: 'mock' } },
      systemPrompt: 'You are a test bot.',
    }

    const result = await ask('go', config)

    expect(chat).toHaveBeenCalledTimes(3)
    for (const call of chat.mock.calls) {
      expect(call[2]).toBe('You are a test bot.')
    }
    expect(result.answer).toBe('done')
  })
})
