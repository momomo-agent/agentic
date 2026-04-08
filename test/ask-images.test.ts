import { describe, it, expect, vi } from 'vitest'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'
import type { Provider } from 'agentic-core'

vi.mock('../src/tools/search.js', () => ({
  searchToolDef: { name: 'web_search', description: '', parameters: {} },
  executeSearch: vi.fn(),
}))

import { executeSearch } from '../src/tools/search.js'

function finalResponse(text: string) {
  return { text, stopReason: 'end' as const, toolCalls: [], rawContent: [], usage: { input: 1, output: 1 } }
}

function toolUseResponse(id: string) {
  return {
    text: '',
    stopReason: 'tool_use' as const,
    toolCalls: [{ id, name: 'web_search', input: { query: 'q' } }],
    rawContent: [],
    usage: { input: 1, output: 1 },
  }
}

function makeConfig(provider: Provider): AgenticConfig {
  return { provider: 'custom', customProvider: provider, apiKey: 'test', tools: ['search'] }
}

// DBB-003: images populated from tool results
describe('DBB-003: images from tool results', () => {
  it('result.images contains images returned by search tool', async () => {
    vi.mocked(executeSearch).mockResolvedValueOnce({ text: 'r', sources: [], images: ['http://img1.png'] })
    const chat = vi.fn()
      .mockResolvedValueOnce(toolUseResponse('t1'))
      .mockResolvedValueOnce(finalResponse('done'))
    const result = await ask('prompt', makeConfig({ chat }))
    expect(result.images).toContain('http://img1.png')
  })
})

// DBB-004: images is empty array when no images
describe('DBB-004: images empty array when no images', () => {
  it('result.images is [] when no tool returns images', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('done'))
    const result = await ask('prompt', makeConfig({ chat }))
    expect(Array.isArray(result.images)).toBe(true)
    expect(result.images!.length).toBe(0)
  })
})
