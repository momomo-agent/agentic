import { describe, it, expect, vi } from 'vitest'
import { runAgentLoopStream } from '../packages/agentic-core/src/index.js'
import type { Provider, StreamChunk, AgentStreamChunk, AgentLoopConfig, ProviderToolCall } from '../packages/agentic-core/src/index.js'

// --- Helpers ---

function mockToolExecutor(tc: ProviderToolCall): Promise<string> {
  return Promise.resolve(`result of ${tc.name}`)
}

/** Create a mock provider whose stream() yields the given chunks */
function mockStreamProvider(chunks: StreamChunk[]): Provider {
  return {
    chat: vi.fn(),
    stream: vi.fn().mockImplementation(async function* () {
      for (const c of chunks) yield c
    }),
  }
}

/** Collect all chunks from runAgentLoopStream */
async function collectChunks(config: AgentLoopConfig): Promise<AgentStreamChunk[]> {
  const chunks: AgentStreamChunk[] = []
  for await (const chunk of runAgentLoopStream(config)) {
    chunks.push(chunk)
  }
  return chunks
}

// --- Text-only streaming ---

describe('runAgentLoopStream: text-only response', () => {
  it('yields cumulative text chunks then done', async () => {
    const provider = mockStreamProvider([
      { type: 'text_delta', text: 'Hello' },
      { type: 'text_delta', text: ' world' },
      { type: 'message_stop', usage: { input: 10, output: 5 } },
    ])

    const chunks = await collectChunks({
      provider,
      prompt: 'say hi',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    })

    // Text chunks should be cumulative
    const textChunks = chunks.filter(c => c.type === 'text')
    expect(textChunks).toHaveLength(2)
    expect(textChunks[0].text).toBe('Hello')
    expect(textChunks[1].text).toBe('Hello world')

    // Final done chunk
    const doneChunk = chunks.find(c => c.type === 'done')
    expect(doneChunk).toBeDefined()
    expect(doneChunk!.result!.answer).toBe('Hello world')
    expect(doneChunk!.result!.toolCalls).toEqual([])
    expect(doneChunk!.result!.usage).toEqual({ input: 10, output: 5 })
  })

  it('handles empty stream response', async () => {
    const provider = mockStreamProvider([
      { type: 'message_stop' },
    ])

    const chunks = await collectChunks({
      provider,
      prompt: 'empty',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    })

    expect(chunks).toHaveLength(1)
    expect(chunks[0].type).toBe('done')
    expect(chunks[0].result!.answer).toBe('')
  })

  it('handles message_stop without usage', async () => {
    const provider = mockStreamProvider([
      { type: 'text_delta', text: 'hi' },
      { type: 'message_stop' },
    ])

    const chunks = await collectChunks({
      provider,
      prompt: 'test',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    })

    const done = chunks.find(c => c.type === 'done')!
    expect(done.result!.usage).toEqual({ input: 0, output: 0 })
  })
})

// --- Tool use streaming ---

describe('runAgentLoopStream: tool use', () => {
  it('yields text → tool_start → tool_result → done sequence', async () => {
    // Round 1: stream text + tool_use
    const round1: StreamChunk[] = [
      { type: 'text_delta', text: 'Let me ' },
      { type: 'text_delta', text: 'search.' },
      { type: 'tool_use', toolCall: { id: 'tc1', name: 'web_search', input: { q: 'test' } } },
      { type: 'message_stop', usage: { input: 10, output: 5 } },
    ]
    // Round 2: final text
    const round2: StreamChunk[] = [
      { type: 'text_delta', text: 'Found it.' },
      { type: 'message_stop', usage: { input: 8, output: 3 } },
    ]

    let callCount = 0
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        const chunks = callCount === 0 ? round1 : round2
        callCount++
        for (const c of chunks) yield c
      }),
    }

    const chunks = await collectChunks({
      provider,
      prompt: 'search',
      toolDefs: [{ name: 'web_search', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
    })

    const types = chunks.map(c => c.type)
    // text, text, tool_start, tool_result, text, done
    expect(types).toEqual(['text', 'text', 'tool_start', 'tool_result', 'text', 'done'])

    // Verify tool_start
    expect(chunks[2].toolCall).toEqual({ tool: 'web_search', input: { q: 'test' } })

    // Verify tool_result
    expect(chunks[3].toolCall).toEqual({ tool: 'web_search', input: { q: 'test' } })
    expect(chunks[3].output).toBe('result of web_search')

    // Verify final done
    const done = chunks[5]
    expect(done.result!.answer).toBe('Let me search.Found it.')
    expect(done.result!.toolCalls).toHaveLength(1)
    expect(done.result!.toolCalls[0]).toEqual({
      tool: 'web_search',
      input: { q: 'test' },
      output: 'result of web_search',
    })
    expect(done.result!.usage).toEqual({ input: 18, output: 8 })
  })

  it('handles multiple tool calls in single round', async () => {
    const round1: StreamChunk[] = [
      { type: 'text_delta', text: 'Computing...' },
      { type: 'tool_use', toolCall: { id: 't1', name: 'calc', input: { expr: '1+1' } } },
      { type: 'tool_use', toolCall: { id: 't2', name: 'calc', input: { expr: '2+2' } } },
      { type: 'message_stop', usage: { input: 5, output: 3 } },
    ]
    const round2: StreamChunk[] = [
      { type: 'text_delta', text: 'Done.' },
      { type: 'message_stop', usage: { input: 5, output: 2 } },
    ]

    let callCount = 0
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        const chunks = callCount === 0 ? round1 : round2
        callCount++
        for (const c of chunks) yield c
      }),
    }

    const chunks = await collectChunks({
      provider,
      prompt: 'compute',
      toolDefs: [{ name: 'calc', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
    })

    const toolStarts = chunks.filter(c => c.type === 'tool_start')
    expect(toolStarts).toHaveLength(2)
    expect(toolStarts[0].toolCall!.tool).toBe('calc')
    expect(toolStarts[1].toolCall!.tool).toBe('calc')

    const toolResults = chunks.filter(c => c.type === 'tool_result')
    expect(toolResults).toHaveLength(2)

    const done = chunks.find(c => c.type === 'done')!
    expect(done.result!.toolCalls).toHaveLength(2)
  })
})

// --- Multi-round loop ---

describe('runAgentLoopStream: multi-round', () => {
  it('accumulates usage across rounds', async () => {
    const round1: StreamChunk[] = [
      { type: 'tool_use', toolCall: { id: 't1', name: 'tool', input: {} } },
      { type: 'message_stop', usage: { input: 10, output: 5 } },
    ]
    const round2: StreamChunk[] = [
      { type: 'tool_use', toolCall: { id: 't2', name: 'tool', input: {} } },
      { type: 'message_stop', usage: { input: 8, output: 4 } },
    ]
    const round3: StreamChunk[] = [
      { type: 'text_delta', text: 'done' },
      { type: 'message_stop', usage: { input: 12, output: 6 } },
    ]

    let callCount = 0
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        const all = [round1, round2, round3]
        const chunks = all[callCount] ?? []
        callCount++
        for (const c of chunks) yield c
      }),
    }

    const chunks = await collectChunks({
      provider,
      prompt: 'multi',
      toolDefs: [{ name: 'tool', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
    })

    const done = chunks.find(c => c.type === 'done')!
    expect(done.result!.usage).toEqual({ input: 30, output: 15 })
    expect(done.result!.toolCalls).toHaveLength(2)
  })

  it('throws after exceeding maxToolRounds', async () => {
    const infiniteRound: StreamChunk[] = [
      { type: 'tool_use', toolCall: { id: 't1', name: 'tool', input: {} } },
      { type: 'message_stop', usage: { input: 1, output: 1 } },
    ]

    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        for (const c of infiniteRound) yield c
      }),
    }

    const gen = runAgentLoopStream({
      provider,
      prompt: 'infinite',
      toolDefs: [{ name: 'tool', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
      maxToolRounds: 3,
    })

    await expect(collectStream(gen)).rejects.toThrow('exceeded 3 rounds')
  })

  it('uses default maxToolRounds of 10', async () => {
    const infiniteRound: StreamChunk[] = [
      { type: 'tool_use', toolCall: { id: 't1', name: 'tool', input: {} } },
      { type: 'message_stop', usage: { input: 1, output: 1 } },
    ]

    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        for (const c of infiniteRound) yield c
      }),
    }

    const gen = runAgentLoopStream({
      provider,
      prompt: 'infinite',
      toolDefs: [{ name: 'tool', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
    })

    await expect(collectStream(gen)).rejects.toThrow('exceeded 10 rounds')
  })
})

// --- System prompt ---

describe('runAgentLoopStream: system prompt', () => {
  it('passes systemPrompt to provider.stream', async () => {
    const provider = mockStreamProvider([
      { type: 'text_delta', text: 'ok' },
      { type: 'message_stop', usage: { input: 5, output: 2 } },
    ])

    await collectChunks({
      provider,
      prompt: 'hello',
      systemPrompt: 'You are helpful.',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    })

    expect(provider.stream).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      'You are helpful.'
    )
  })

  it('sends user prompt as first message', async () => {
    const provider = mockStreamProvider([
      { type: 'text_delta', text: 'ok' },
      { type: 'message_stop', usage: { input: 5, output: 2 } },
    ])

    await collectChunks({
      provider,
      prompt: 'my question',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    })

    const messages = (provider.stream as any).mock.calls[0][0]
    expect(messages[0]).toEqual({ role: 'user', content: 'my question' })
  })
})

// --- Provider interface ---

describe('Provider.stream interface', () => {
  it('Provider type requires stream method', () => {
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        yield { type: 'text_delta', text: 'hi' }
      }),
    }
    expect(typeof provider.stream).toBe('function')
  })

  it('createProvider produces provider with stream method', async () => {
    const { createProvider } = await import('../packages/agentic-core/src/index.js')
    const provider = createProvider({ provider: 'anthropic', apiKey: 'sk-ant-test123' })
    expect(typeof provider.stream).toBe('function')
  })

  it('createProvider openai produces provider with stream method', async () => {
    const { createProvider } = await import('../packages/agentic-core/src/index.js')
    const provider = createProvider({ provider: 'openai', apiKey: 'sk-test123' })
    expect(typeof provider.stream).toBe('function')
  })
})

// --- Edge cases ---

describe('runAgentLoopStream: edge cases', () => {
  it('handles tool call with empty input', async () => {
    const round1: StreamChunk[] = [
      { type: 'tool_use', toolCall: { id: 't1', name: 'noop', input: {} } },
      { type: 'message_stop', usage: { input: 5, output: 3 } },
    ]
    const round2: StreamChunk[] = [
      { type: 'text_delta', text: 'ok' },
      { type: 'message_stop', usage: { input: 5, output: 2 } },
    ]

    let callCount = 0
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        const chunks = callCount === 0 ? round1 : round2
        callCount++
        for (const c of chunks) yield c
      }),
    }

    const chunks = await collectChunks({
      provider,
      prompt: 'test',
      toolDefs: [{ name: 'noop', description: 'd', parameters: {} }],
      executeToolCall: mockToolExecutor,
    })

    const done = chunks.find(c => c.type === 'done')!
    expect(done.result!.toolCalls[0].input).toEqual({})
  })

  it('tool executor rejection propagates', async () => {
    const round1: StreamChunk[] = [
      { type: 'tool_use', toolCall: { id: 't1', name: 'fail', input: {} } },
      { type: 'message_stop', usage: { input: 5, output: 3 } },
    ]

    const provider = mockStreamProvider(round1)

    const gen = runAgentLoopStream({
      provider,
      prompt: 'test',
      toolDefs: [{ name: 'fail', description: 'd', parameters: {} }],
      executeToolCall: () => Promise.reject(new Error('tool failed')),
    })

    await expect(collectStream(gen)).rejects.toThrow('tool failed')
  })

  it('provider stream error propagates', async () => {
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        yield { type: 'text_delta', text: 'partial' }
        throw new Error('stream broke')
      }),
    }

    const gen = runAgentLoopStream({
      provider,
      prompt: 'test',
      toolDefs: [],
      executeToolCall: mockToolExecutor,
    })

    await expect(collectStream(gen)).rejects.toThrow('stream broke')
  })
})

// --- Utility ---

async function collectStream<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of gen) items.push(item)
  return items
}
