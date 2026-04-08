import { describe, it, expect, vi } from 'vitest'
import { runAgentLoopStream } from '../packages/agentic-core/src/loop.js'
import { askStream, ask } from '../src/ask.js'
import type { Provider, StreamChunk, AgentStreamChunk } from '../packages/agentic-core/src/types.js'

// Helper: create a mock provider whose stream() yields the given chunks
function mockStreamProvider(chunks: StreamChunk[][]): Provider {
  let callIndex = 0
  return {
    chat: vi.fn().mockResolvedValue({
      text: 'fallback',
      toolCalls: [],
      usage: { input: 0, output: 0 },
      stopReason: 'end',
    }),
    stream: vi.fn().mockImplementation(async function* () {
      const roundChunks = chunks[callIndex++] ?? []
      for (const chunk of roundChunks) {
        yield chunk
      }
    }),
  }
}

describe('Streaming — runAgentLoopStream', () => {
  it('yields text chunks from provider stream', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' world' },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
    ])

    const chunks: AgentStreamChunk[] = []
    for await (const chunk of runAgentLoopStream({
      provider,
      prompt: 'test',
      toolDefs: [],
      executeToolCall: async () => 'never',
    })) {
      chunks.push(chunk)
    }

    // Should yield 2 text chunks (accumulated) + 1 done
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toEqual({ type: 'text', text: 'Hello' })
    expect(chunks[1]).toEqual({ type: 'text', text: 'Hello world' })
    expect(chunks[2].type).toBe('done')
    expect(chunks[2].result?.answer).toBe('Hello world')
  })

  it('yields tool_start and tool_result for tool calls', async () => {
    const provider = mockStreamProvider([
      // Round 1: tool_use
      [
        {
          type: 'tool_use',
          toolCall: { id: 'tc-1', name: 'calculator', input: { expr: '2+2' } },
        },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
      // Round 2: text response
      [
        { type: 'text_delta', text: 'The answer is 4' },
        { type: 'message_stop', usage: { input: 8, output: 3 } },
      ],
    ])

    const chunks: AgentStreamChunk[] = []
    for await (const chunk of runAgentLoopStream({
      provider,
      prompt: 'what is 2+2?',
      toolDefs: [{ name: 'calculator', description: 'calc', parameters: {} }],
      executeToolCall: async () => '4',
    })) {
      chunks.push(chunk)
    }

    const types = chunks.map((c) => c.type)
    expect(types).toEqual(['tool_start', 'tool_result', 'text', 'done'])

    // tool_start has correct tool info
    expect(chunks[0].toolCall?.tool).toBe('calculator')
    expect(chunks[0].toolCall?.input).toEqual({ expr: '2+2' })

    // tool_result has output
    expect(chunks[1].output).toBe('4')

    // done has final answer
    expect(chunks[3].result?.answer).toBe('The answer is 4')
  })

  it('accumulates usage across rounds', async () => {
    const provider = mockStreamProvider([
      // Round 1: tool_use
      [
        {
          type: 'tool_use',
          toolCall: { id: 'tc-1', name: 'tool1', input: {} },
        },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
      // Round 2: text
      [
        { type: 'text_delta', text: 'Done' },
        { type: 'message_stop', usage: { input: 8, output: 3 } },
      ],
    ])

    const chunks: AgentStreamChunk[] = []
    for await (const chunk of runAgentLoopStream({
      provider,
      prompt: 'test',
      toolDefs: [{ name: 'tool1', description: '', parameters: {} }],
      executeToolCall: async () => 'ok',
    })) {
      chunks.push(chunk)
    }

    const done = chunks.find((c) => c.type === 'done')!
    expect(done.result?.usage).toEqual({ input: 18, output: 8 })
  })

  it('tracks tool calls in final result', async () => {
    const provider = mockStreamProvider([
      [
        {
          type: 'tool_use',
          toolCall: { id: 'tc-1', name: 'calc', input: { x: 1 } },
        },
        { type: 'message_stop', usage: { input: 5, output: 2 } },
      ],
      [
        { type: 'text_delta', text: 'Answer: 2' },
        { type: 'message_stop', usage: { input: 5, output: 2 } },
      ],
    ])

    const chunks: AgentStreamChunk[] = []
    for await (const chunk of runAgentLoopStream({
      provider,
      prompt: 'test',
      toolDefs: [{ name: 'calc', description: '', parameters: {} }],
      executeToolCall: async (tc) => `result for ${tc.name}`,
    })) {
      chunks.push(chunk)
    }

    const done = chunks.find((c) => c.type === 'done')!
    expect(done.result?.toolCalls).toHaveLength(1)
    expect(done.result?.toolCalls[0]).toEqual({
      tool: 'calc',
      input: { x: 1 },
      output: 'result for calc',
    })
  })

  it('handles empty stream (immediate message_stop)', async () => {
    const provider = mockStreamProvider([
      [{ type: 'message_stop', usage: { input: 5, output: 0 } }],
    ])

    const chunks: AgentStreamChunk[] = []
    for await (const chunk of runAgentLoopStream({
      provider,
      prompt: 'test',
      toolDefs: [],
      executeToolCall: async () => 'never',
    })) {
      chunks.push(chunk)
    }

    expect(chunks).toHaveLength(1)
    expect(chunks[0].type).toBe('done')
    expect(chunks[0].result?.answer).toBe('')
  })

  it('propagates provider stream errors', async () => {
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        yield { type: 'text_delta', text: 'partial' }
        throw new Error('stream connection lost')
      }),
    }

    const chunks: AgentStreamChunk[] = []
    await expect(async () => {
      for await (const chunk of runAgentLoopStream({
        provider,
        prompt: 'test',
        toolDefs: [],
        executeToolCall: async () => 'never',
      })) {
        chunks.push(chunk)
      }
    }).rejects.toThrow('stream connection lost')

    // Should have yielded the partial text before error
    expect(chunks).toHaveLength(1)
    expect(chunks[0].type).toBe('text')
  })

  it('handles multiple tool calls in same round', async () => {
    const provider = mockStreamProvider([
      [
        {
          type: 'tool_use',
          toolCall: { id: 'tc-1', name: 'tool_a', input: { a: 1 } },
        },
        {
          type: 'tool_use',
          toolCall: { id: 'tc-2', name: 'tool_b', input: { b: 2 } },
        },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
      [
        { type: 'text_delta', text: 'Both done' },
        { type: 'message_stop', usage: { input: 5, output: 2 } },
      ],
    ])

    const chunks: AgentStreamChunk[] = []
    for await (const chunk of runAgentLoopStream({
      provider,
      prompt: 'test',
      toolDefs: [
        { name: 'tool_a', description: '', parameters: {} },
        { name: 'tool_b', description: '', parameters: {} },
      ],
      executeToolCall: async (tc) => `${tc.name}-result`,
    })) {
      chunks.push(chunk)
    }

    const types = chunks.map((c) => c.type)
    expect(types).toEqual(['tool_start', 'tool_result', 'tool_start', 'tool_result', 'text', 'done'])
    expect(chunks[0].toolCall?.tool).toBe('tool_a')
    expect(chunks[2].toolCall?.tool).toBe('tool_b')
  })
})

describe('Streaming — askStream', () => {
  it('yields streaming chunks via askStream with custom provider', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' there' },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
    ])

    const chunks: any[] = []
    for await (const chunk of askStream('say hi', {
      provider: 'custom',
      customProvider: provider,
      tools: [],
    })) {
      chunks.push(chunk)
    }

    expect(chunks.length).toBeGreaterThanOrEqual(3)
    // Last chunk should be done
    expect(chunks[chunks.length - 1].type).toBe('done')
  })

  it('handles tool execution in askStream', async () => {
    const provider = mockStreamProvider([
      [
        {
          type: 'tool_use',
          toolCall: { id: 'tc-1', name: 'code_exec', input: { code: '1+1' } },
        },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
      [
        { type: 'text_delta', text: 'Result: 2' },
        { type: 'message_stop', usage: { input: 5, output: 2 } },
      ],
    ])

    const chunks: any[] = []
    for await (const chunk of askStream('calculate 1+1', {
      provider: 'custom',
      customProvider: provider,
      tools: ['code'],
    })) {
      chunks.push(chunk)
    }

    const toolStart = chunks.find((c) => c.type === 'tool_start')
    const toolResult = chunks.find((c) => c.type === 'tool_result')
    const done = chunks.find((c) => c.type === 'done')

    expect(toolStart).toBeDefined()
    expect(toolResult).toBeDefined()
    expect(done).toBeDefined()
  })
})

describe('Streaming — backward compatibility', () => {
  it('ask() still returns AgenticResult (not a generator)', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'text_delta', text: 'Hello' },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
    ])

    const result = await ask('say hi', {
      provider: 'custom',
      customProvider: provider,
      tools: [],
    })

    // ask() returns a Promise<AgenticResult>, not an async generator
    expect(result).toHaveProperty('answer')
    expect(result).toHaveProperty('usage')
    expect(result).toHaveProperty('images')
    expect(typeof result.answer).toBe('string')
    expect(typeof result.usage.input).toBe('number')
    expect(typeof result.usage.output).toBe('number')
  })

  it('ask() delegates to runAgentLoop (chat), not stream', async () => {
    const provider: Provider = {
      chat: vi.fn().mockResolvedValue({
        text: 'chat response',
        toolCalls: [],
        usage: { input: 10, output: 5 },
        stopReason: 'end',
      }),
      stream: vi.fn(),
    }

    const result = await ask('test', {
      provider: 'custom',
      customProvider: provider,
      tools: [],
    })

    expect(result.answer).toBe('chat response')
    expect(provider.chat).toHaveBeenCalled()
  })
})
