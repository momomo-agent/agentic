import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'
import type { Provider, ProviderResponse } from 'agentic-core'

function makeConfig(provider: Provider): AgenticConfig {
  return {
    provider: 'custom',
    customProvider: provider,
    apiKey: 'test',
    tools: [],
  }
}

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

// DBB-001: multi-round loop continues until non-tool_use stop
describe('DBB-001: multi-round tool loop', () => {
  it('continues through 2 tool rounds and returns final text', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce(toolUseResponse('t1', 'web_search', { query: 'step1' }))
      .mockResolvedValueOnce(toolUseResponse('t2', 'web_search', { query: 'step2' }))
      .mockResolvedValueOnce(finalResponse('done'))

    // mock search tool by providing a provider that handles tool calls
    // We need web_search in tools, but we'll mock the search module
    const provider: Provider = { chat }

    // Use a config with search tool enabled
    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: provider,
      apiKey: 'test',
      tools: ['search'],
      toolConfig: { search: { apiKey: 'mock' } },
    }

    // Mock executeSearch to avoid real HTTP calls
    vi.mock('../src/tools/search.js', () => ({
      searchToolDef: { name: 'web_search', description: '', parameters: {} },
      executeSearch: vi.fn().mockResolvedValue({ text: 'result', sources: [], images: [] }),
    }))

    const result = await ask('test prompt', config)

    expect(chat).toHaveBeenCalledTimes(3)
    expect(result.answer).toBe('done')
  })
})

// DBB-002: loop terminates after MAX_TOOL_ROUNDS
describe('DBB-002: MAX_TOOL_ROUNDS limit', () => {
  it('throws after 10 rounds of continuous tool_use', async () => {
    const chat = vi.fn().mockResolvedValue(
      toolUseResponse('t1', 'web_search', { query: 'loop' })
    )

    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: ['search'],
      toolConfig: { search: { apiKey: 'mock' } },
    }

    await expect(ask('loop forever', config)).rejects.toThrow('exceeded')
    expect(chat).toHaveBeenCalledTimes(10)
  })
})
