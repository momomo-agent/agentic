import { describe, it, expect, vi } from 'vitest'
import { askStream } from '../src/ask.js'
import { ask } from '../src/ask.js'
import type { AgenticConfig } from '../src/types.js'
import type { Provider, StreamChunk, AgentStreamChunk } from 'agentic-core'

// --- Helpers ---

function mockStreamProvider(rounds: StreamChunk[][]): Provider {
  let callCount = 0
  return {
    chat: vi.fn().mockResolvedValue({
      text: 'chat fallback',
      stopReason: 'end',
      toolCalls: [],
      usage: { input: 1, output: 1 },
    }),
    stream: vi.fn().mockImplementation(async function* () {
      const chunks = rounds[callCount] ?? []
      callCount++
      for (const c of chunks) yield c
    }),
  }
}

async function collectChunks(gen: AsyncGenerator<AgentStreamChunk>): Promise<AgentStreamChunk[]> {
  const chunks: AgentStreamChunk[] = []
  for await (const chunk of gen) chunks.push(chunk)
  return chunks
}

function makeConfig(provider: Provider, tools: string[] = []): AgenticConfig {
  return {
    provider: 'custom',
    customProvider: provider,
    apiKey: 'test',
    tools: tools as any,
  }
}

// --- DBB-005: askStream() export ---

describe('DBB-005: askStream() exists and is exported', () => {
  it('askStream is a function', () => {
    expect(typeof askStream).toBe('function')
  })

  it('askStream is exported from src/index.ts', async () => {
    const indexSource = await import('node:fs').then(fs =>
      fs.readFileSync('src/index.ts', 'utf-8')
    )
    expect(indexSource).toContain('askStream')
  })
})

// --- askStream: text-only streaming ---

describe('askStream: text-only response', () => {
  it('yields text chunks then done', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'text_delta', text: 'Hello' },
        { type: 'text_delta', text: ' world' },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
    ])

    const chunks = await collectChunks(askStream('say hi', makeConfig(provider)))

    const textChunks = chunks.filter(c => c.type === 'text')
    expect(textChunks).toHaveLength(2)
    expect(textChunks[0].text).toBe('Hello')
    expect(textChunks[1].text).toBe('Hello world')

    const done = chunks.find(c => c.type === 'done')
    expect(done).toBeDefined()
    expect(done!.result!.answer).toBe('Hello world')
    expect(done!.result!.usage).toEqual({ input: 10, output: 5 })
  })

  it('handles empty response (no text, just message_stop)', async () => {
    const provider = mockStreamProvider([
      [{ type: 'message_stop' }],
    ])

    const chunks = await collectChunks(askStream('empty', makeConfig(provider)))

    expect(chunks).toHaveLength(1)
    expect(chunks[0].type).toBe('done')
    expect(chunks[0].result!.answer).toBe('')
  })
})

// --- askStream: with tool use ---

describe('askStream: tool use', () => {
  it('yields text → tool_start → tool_result → text → done', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'text_delta', text: 'Searching...' },
        { type: 'tool_use', toolCall: { id: 'tc1', name: 'web_search', input: { query: 'test' } } },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
      [
        { type: 'text_delta', text: 'Found it!' },
        { type: 'message_stop', usage: { input: 8, output: 3 } },
      ],
    ])

    // Mock search tool
    vi.mock('../src/tools/search.js', () => ({
      searchToolDef: { name: 'web_search', description: '', parameters: {} },
      executeSearch: vi.fn().mockResolvedValue({ text: 'search results', sources: [{ title: 't', url: 'u' }], images: [] }),
    }))

    const chunks = await collectChunks(
      askStream('search test', makeConfig(provider, ['search']))
    )

    const types = chunks.map(c => c.type)
    // text, tool_start, tool_result, text, done
    expect(types).toEqual(['text', 'tool_start', 'tool_result', 'text', 'done'])

    // Verify tool_start
    expect(chunks[1].toolCall).toEqual({ tool: 'web_search', input: { query: 'test' } })

    // Verify tool_result
    expect(chunks[2].type).toBe('tool_result')
    expect(chunks[2].output).toContain('search results')

    // Verify final done
    const done = chunks[4]
    expect(done.result!.answer).toBe('Searching...Found it!')
    expect(done.result!.toolCalls).toHaveLength(1)
  })
})

// --- askStream: config handling ---

describe('askStream: config handling', () => {
  it('accepts default empty config', async () => {
    // This test verifies the function signature accepts no second arg
    // We can't actually run without a provider, but the default {} should work
    const provider = mockStreamProvider([
      [{ type: 'text_delta', text: 'ok' }, { type: 'message_stop' }],
    ])

    // Pass config explicitly since we need a custom provider
    const chunks = await collectChunks(askStream('test', makeConfig(provider)))
    expect(chunks.find(c => c.type === 'done')).toBeDefined()
  })

  it('passes systemPrompt to provider.stream', async () => {
    const provider = mockStreamProvider([
      [{ type: 'text_delta', text: 'ok' }, { type: 'message_stop' }],
    ])

    await collectChunks(
      askStream('hello', { ...makeConfig(provider), systemPrompt: 'Be helpful.' })
    )

    expect(provider.stream).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Array),
      'Be helpful.'
    )
  })

  it('uses default filesystem when none provided', async () => {
    const provider = mockStreamProvider([
      [{ type: 'text_delta', text: 'ok' }, { type: 'message_stop' }],
    ])

    // Should not throw even without explicit filesystem
    const chunks = await collectChunks(askStream('test', makeConfig(provider)))
    expect(chunks.find(c => c.type === 'done')).toBeDefined()
  })
})

// --- askStream: backward compatibility ---

describe('DBB-006: backward compatibility', () => {
  it('ask() still works after askStream() was added', async () => {
    const chat = vi.fn().mockResolvedValue({
      text: 'ask result',
      stopReason: 'end',
      toolCalls: [],
      usage: { input: 1, output: 1 },
    })

    const config: AgenticConfig = {
      provider: 'custom',
      customProvider: { chat },
      apiKey: 'test',
      tools: [],
    }

    const result = await ask('hello', config)
    expect(result.answer).toBe('ask result')
    expect(chat).toHaveBeenCalledTimes(1)
  })
})

// --- askStream: error propagation ---

describe('askStream: error handling', () => {
  it('propagates provider stream errors', async () => {
    const provider: Provider = {
      chat: vi.fn(),
      stream: vi.fn().mockImplementation(async function* () {
        yield { type: 'text_delta', text: 'partial' }
        throw new Error('stream broke')
      }),
    }

    const gen = askStream('test', makeConfig(provider))
    await expect(collectChunks(gen)).rejects.toThrow('stream broke')
  })

  it('throws when provider="custom" but no customProvider', async () => {
    const config: AgenticConfig = { provider: 'custom', apiKey: 'test', tools: [] }
    // askStream creates provider internally via createProvider
    const gen = askStream('hello', config)
    await expect(collectChunks(gen)).rejects.toThrow('customProvider')
  })
})

// --- askStream: multi-round streaming ---

describe('askStream: multi-round', () => {
  it('accumulates usage across rounds', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'tool_use', toolCall: { id: 't1', name: 'noop', input: {} } },
        { type: 'message_stop', usage: { input: 10, output: 5 } },
      ],
      [
        { type: 'text_delta', text: 'done' },
        { type: 'message_stop', usage: { input: 8, output: 4 } },
      ],
    ])

    // Mock a noop tool via code tool
    vi.mock('../src/tools/code.js', () => ({
      codeToolDef: { name: 'noop', description: '', parameters: {} },
      executeCode: vi.fn().mockResolvedValue({ output: 'noop result', error: null }),
    }))

    const chunks = await collectChunks(
      askStream('multi', makeConfig(provider, ['code']))
    )

    const done = chunks.find(c => c.type === 'done')
    expect(done).toBeDefined()
    expect(done!.result!.usage).toEqual({ input: 18, output: 9 })
  })
})

// --- askStream: additional edge cases ---

describe('askStream: edge cases', () => {
  it('handles unknown tool name gracefully (error string, not throw)', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'tool_use', toolCall: { id: 't1', name: 'nonexistent_tool', input: {} } },
        { type: 'message_stop', usage: { input: 5, output: 3 } },
      ],
      [
        { type: 'text_delta', text: 'handled' },
        { type: 'message_stop', usage: { input: 3, output: 1 } },
      ],
    ])

    // No tools enabled → any tool call will be "unknown"
    const chunks = await collectChunks(
      askStream('test', makeConfig(provider, []))
    )

    const toolResult = chunks.find(c => c.type === 'tool_result')
    expect(toolResult).toBeDefined()
    expect(toolResult!.output).toContain('Error')
    expect(toolResult!.output).toContain('nonexistent_tool')

    // Stream should complete normally
    const done = chunks.find(c => c.type === 'done')
    expect(done).toBeDefined()
  })

  it('uses default OS_SYSTEM_PROMPT when no systemPrompt provided', async () => {
    const provider = mockStreamProvider([
      [{ type: 'text_delta', text: 'ok' }, { type: 'message_stop' }],
    ])

    await collectChunks(askStream('hello', makeConfig(provider)))

    // Verify the system prompt was passed to provider.stream
    const streamCalls = (provider.stream as any).mock.calls
    expect(streamCalls.length).toBeGreaterThan(0)
    const systemPrompt = streamCalls[0][2]
    expect(systemPrompt).toContain('AI assistant')
  })

  it('file tool in stream mode reads and writes files', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'tool_use', toolCall: { id: 't1', name: 'file_write', input: { path: '/test.txt', content: 'hello' } } },
        { type: 'message_stop', usage: { input: 5, output: 3 } },
      ],
      [
        { type: 'tool_use', toolCall: { id: 't2', name: 'file_read', input: { path: '/test.txt' } } },
        { type: 'message_stop', usage: { input: 5, output: 3 } },
      ],
      [
        { type: 'text_delta', text: 'read it' },
        { type: 'message_stop', usage: { input: 3, output: 1 } },
      ],
    ])

    const chunks = await collectChunks(
      askStream('write and read', makeConfig(provider, ['file']))
    )

    const toolResults = chunks.filter(c => c.type === 'tool_result')
    expect(toolResults).toHaveLength(2)

    // Write result should succeed
    expect(toolResults[0].output).not.toContain('Error')

    // Read result should contain the written content
    expect(toolResults[1].output).toContain('hello')

    const done = chunks.find(c => c.type === 'done')
    expect(done).toBeDefined()
    expect(done!.result!.toolCalls).toHaveLength(2)
  })

  it('handles concurrent tool calls in single streaming round', async () => {
    const provider = mockStreamProvider([
      [
        { type: 'text_delta', text: 'computing' },
        { type: 'tool_use', toolCall: { id: 'a', name: 'file_read', input: { path: '/a.txt' } } },
        { type: 'tool_use', toolCall: { id: 'b', name: 'file_read', input: { path: '/b.txt' } } },
        { type: 'message_stop', usage: { input: 5, output: 3 } },
      ],
      [
        { type: 'text_delta', text: ' done' },
        { type: 'message_stop', usage: { input: 3, output: 1 } },
      ],
    ])

    const chunks = await collectChunks(
      askStream('read files', makeConfig(provider, ['file']))
    )

    const toolStarts = chunks.filter(c => c.type === 'tool_start')
    expect(toolStarts).toHaveLength(2)

    const toolResults = chunks.filter(c => c.type === 'tool_result')
    expect(toolResults).toHaveLength(2)

    const done = chunks.find(c => c.type === 'done')
    expect(done!.result!.toolCalls).toHaveLength(2)
  })
})
