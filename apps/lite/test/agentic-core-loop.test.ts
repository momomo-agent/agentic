import { describe, it, expect, vi } from 'vitest'
import { runAgentLoop, createProvider } from '../packages/agentic-core/src/index.js'
import type { Provider, ProviderResponse, ProviderToolCall, AgentLoopConfig } from '../packages/agentic-core/src/index.js'

function toolUseResponse(id: string, name: string, input: Record<string, unknown>): ProviderResponse {
  return {
    text: '',
    stopReason: 'tool_use',
    toolCalls: [{ id, name, input }],
    rawContent: [{ type: 'tool_use', id, name, input }],
    usage: { input: 10, output: 5 },
  }
}

function finalResponse(text: string): ProviderResponse {
  return {
    text,
    stopReason: 'end',
    toolCalls: [],
    rawContent: [{ type: 'text', text }],
    usage: { input: 15, output: 8 },
  }
}

function mockToolExecutor(tc: ProviderToolCall): Promise<string> {
  return Promise.resolve(`result of ${tc.name}`)
}

describe('runAgentLoop: DBB-004 agent loop extraction', () => {
  it('returns final answer when provider returns stopReason=end', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('hello world'))
    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'say hello',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    }

    const result = await runAgentLoop(config)

    expect(result.answer).toBe('hello world')
    expect(result.toolCalls).toEqual([])
    expect(result.usage).toEqual({ input: 15, output: 8 })
    expect(chat).toHaveBeenCalledTimes(1)
  })

  it('continues through tool rounds until final response', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce(toolUseResponse('t1', 'calculator', { expr: '1+1' }))
      .mockResolvedValueOnce(toolUseResponse('t2', 'calculator', { expr: '2+2' }))
      .mockResolvedValueOnce(finalResponse('computation done'))

    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'calculate',
      toolDefs: [{ name: 'calculator', description: 'calc', parameters: {} }],
      executeToolCall: mockToolExecutor,
    }

    const result = await runAgentLoop(config)

    expect(result.answer).toBe('computation done')
    expect(result.toolCalls).toHaveLength(2)
    expect(result.toolCalls[0]).toEqual({ tool: 'calculator', input: { expr: '1+1' }, output: 'result of calculator' })
    expect(result.toolCalls[1]).toEqual({ tool: 'calculator', input: { expr: '2+2' }, output: 'result of calculator' })
    expect(chat).toHaveBeenCalledTimes(3)
  })

  it('accumulates usage across rounds', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce(toolUseResponse('t1', 'tool', {}))
      .mockResolvedValueOnce(finalResponse('done'))

    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'test',
      toolDefs: [{ name: 'tool', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
    }

    const result = await runAgentLoop(config)

    // Round 1: input=10, output=5. Round 2: input=15, output=8
    expect(result.usage).toEqual({ input: 25, output: 13 })
  })

  it('throws after exceeding maxToolRounds', async () => {
    const chat = vi.fn().mockResolvedValue(
      toolUseResponse('t1', 'tool', {})
    )

    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'infinite loop',
      toolDefs: [{ name: 'tool', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
      maxToolRounds: 3,
    }

    await expect(runAgentLoop(config)).rejects.toThrow('exceeded 3 rounds')
    expect(chat).toHaveBeenCalledTimes(3)
  })

  it('uses default maxToolRounds of 10', async () => {
    const chat = vi.fn().mockResolvedValue(
      toolUseResponse('t1', 'tool', {})
    )

    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'infinite loop',
      toolDefs: [{ name: 'tool', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
    }

    await expect(runAgentLoop(config)).rejects.toThrow('exceeded 10 rounds')
    expect(chat).toHaveBeenCalledTimes(10)
  })

  it('handles multiple tool calls in single round', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce({
        text: '',
        stopReason: 'tool_use',
        toolCalls: [
          { id: 't1', name: 'tool_a', input: { x: 1 } },
          { id: 't2', name: 'tool_b', input: { y: 2 } },
        ],
        rawContent: [
          { type: 'tool_use', id: 't1', name: 'tool_a', input: { x: 1 } },
          { type: 'tool_use', id: 't2', name: 'tool_b', input: { y: 2 } },
        ],
        usage: { input: 5, output: 5 },
      })
      .mockResolvedValueOnce(finalResponse('both done'))

    const provider: Provider = { chat }
    const executor = vi.fn().mockResolvedValue('ok')

    const config: AgentLoopConfig = {
      provider,
      prompt: 'parallel tools',
      toolDefs: [
        { name: 'tool_a', description: 'a', parameters: {} },
        { name: 'tool_b', description: 'b', parameters: {} },
      ],
      executeToolCall: executor,
    }

    const result = await runAgentLoop(config)

    expect(result.toolCalls).toHaveLength(2)
    expect(executor).toHaveBeenCalledTimes(2)
    expect(result.answer).toBe('both done')
  })

  it('passes systemPrompt to provider.chat', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('ok'))
    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'hello',
      systemPrompt: 'You are a helpful assistant.',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    }

    await runAgentLoop(config)

    expect(chat).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      'You are a helpful assistant.'
    )
  })

  it('sends user prompt as first message', async () => {
    const chat = vi.fn().mockResolvedValueOnce(finalResponse('ok'))
    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'my question',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    }

    await runAgentLoop(config)

    const messages = chat.mock.calls[0][0]
    expect(messages[0]).toEqual({ role: 'user', content: 'my question' })
  })

  it('pushes assistant and tool messages after tool execution', async () => {
    const chat = vi.fn()
      .mockResolvedValueOnce(toolUseResponse('t1', 'web_search', { q: 'test' }))
      .mockResolvedValueOnce(finalResponse('found it'))

    const provider: Provider = { chat }

    const config: AgentLoopConfig = {
      provider,
      prompt: 'search',
      toolDefs: [{ name: 'web_search', description: 'd', parameters: {} }],
      executeToolCall: () => Promise.resolve('search results'),
    }

    await runAgentLoop(config)

    // Second call should have 3 messages: user, assistant, tool
    const messages = chat.mock.calls[1][0]
    expect(messages).toHaveLength(3)
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')
    expect(messages[2].role).toBe('tool')
  })
})

describe('createProvider: DBB-005 provider factory', () => {
  it('creates anthropic provider with valid sk-ant- key', () => {
    const provider = createProvider({ provider: 'anthropic', apiKey: 'sk-ant-test123' })
    expect(provider).toBeDefined()
    expect(typeof provider.chat).toBe('function')
  })

  it('creates openai provider with valid sk- key', () => {
    const provider = createProvider({ provider: 'openai', apiKey: 'sk-test123' })
    expect(provider).toBeDefined()
    expect(typeof provider.chat).toBe('function')
  })

  it('creates custom provider from customProvider object', () => {
    const mock: Provider = { chat: vi.fn() }
    const provider = createProvider({ provider: 'custom', customProvider: mock })
    expect(provider).toBe(mock)
  })

  it('creates custom provider from baseUrl (falls back to openai)', () => {
    const provider = createProvider({ provider: 'custom', baseUrl: 'http://localhost:8080' })
    expect(provider).toBeDefined()
    expect(typeof provider.chat).toBe('function')
  })

  it('throws for missing apiKey on non-custom provider', () => {
    expect(() => createProvider({ provider: 'anthropic' })).toThrow('apiKey is required')
  })

  it('throws for invalid anthropic apiKey format', () => {
    expect(() => createProvider({ provider: 'anthropic', apiKey: 'sk-wrong-format' })).toThrow('Invalid apiKey format')
  })

  it('throws for invalid openai apiKey format', () => {
    expect(() => createProvider({ provider: 'openai', apiKey: 'bad-key' })).toThrow('Invalid apiKey format')
  })

  it('throws for unknown provider', () => {
    expect(() => createProvider({ provider: 'unknown' as any, apiKey: 'sk-test' })).toThrow('Unknown provider')
  })

  it('throws for custom provider without customProvider or baseUrl', () => {
    expect(() => createProvider({ provider: 'custom' })).toThrow('customProvider or baseUrl is required')
  })

  it('auto-detects anthropic from sk-ant- prefix', () => {
    const provider = createProvider({ apiKey: 'sk-ant-abc123' })
    expect(provider).toBeDefined()
  })

  it('auto-detects anthropic from baseUrl containing anthropic', () => {
    const provider = createProvider({ apiKey: 'sk-ant-api-key', baseUrl: 'https://api.anthropic.com' })
    expect(provider).toBeDefined()
  })

  it('auto-detects openai as default', () => {
    const provider = createProvider({ apiKey: 'sk-default123' })
    expect(provider).toBeDefined()
  })
})
