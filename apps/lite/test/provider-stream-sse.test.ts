import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { StreamChunk } from '../packages/agentic-core/src/types.js'

// Helper: create a ReadableStream from SSE text
function sseStream(events: string[]): ReadableStream<Uint8Array> {
  const text = events.map(e => `data: ${e}\n\n`).join('')
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text))
      controller.close()
    },
  })
}

// Helper: create a ReadableStream that delivers data in chunks (simulating real streaming)
function sseStreamChunked(sseText: string, chunkSize: number): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (let i = 0; i < sseText.length; i += chunkSize) {
        controller.enqueue(new TextEncoder().encode(sseText.slice(i, i + chunkSize)))
      }
      controller.close()
    },
  })
}

// Helper: collect all chunks from an async generator
async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = []
  for await (const item of gen) items.push(item)
  return items
}

// --- Anthropic Provider SSE Parsing ---

describe('DBB-002: Anthropic provider stream() SSE parsing', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function createProvider() {
    const { createAnthropicProvider } = await import('../packages/agentic-core/src/providers/anthropic.js')
    return createAnthropicProvider({ apiKey: 'sk-ant-test123' })
  }

  it('yields text_delta chunks from SSE stream', async () => {
    const sseEvents = [
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hello' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: ' world' } }),
      JSON.stringify({ type: 'message_delta', usage: { input_tokens: 10, output_tokens: 5 } }),
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream([{ role: 'user', content: 'hi' }], [], undefined))

    const textChunks = chunks.filter(c => c.type === 'text_delta')
    expect(textChunks).toHaveLength(2)
    expect(textChunks[0].text).toBe('Hello')
    expect(textChunks[1].text).toBe(' world')

    const stop = chunks.find(c => c.type === 'message_stop')
    expect(stop).toBeDefined()
    expect(stop!.usage).toEqual({ input: 10, output: 5 })
  })

  it('yields tool_use chunk with accumulated input_json_delta', async () => {
    const sseEvents = [
      JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tc-123', name: 'calculator' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"ex' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: 'pr":' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '"2+2"}' } }),
      JSON.stringify({ type: 'content_block_stop', index: 0 }),
      JSON.stringify({ type: 'message_delta', usage: { input_tokens: 15, output_tokens: 8 } }),
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream([{ role: 'user', content: 'calc' }], [{ name: 'calculator', description: 'd', parameters: {} }], undefined))

    const toolChunks = chunks.filter(c => c.type === 'tool_use')
    expect(toolChunks).toHaveLength(1)
    expect(toolChunks[0].toolCall).toEqual({ id: 'tc-123', name: 'calculator', input: { expr: '2+2' } })
  })

  it('handles multiple tool calls in same stream', async () => {
    const sseEvents = [
      JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'tc-1', name: 'tool_a' } }),
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"x":1}' } }),
      JSON.stringify({ type: 'content_block_stop', index: 0 }),
      JSON.stringify({ type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tc-2', name: 'tool_b' } }),
      JSON.stringify({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"y":2}' } }),
      JSON.stringify({ type: 'content_block_stop', index: 1 }),
      JSON.stringify({ type: 'message_delta', usage: { input_tokens: 20, output_tokens: 10 } }),
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream(
      [{ role: 'user', content: 'multi' }],
      [{ name: 'tool_a', description: '', parameters: {} }, { name: 'tool_b', description: '', parameters: {} }],
      undefined
    ))

    const toolChunks = chunks.filter(c => c.type === 'tool_use')
    expect(toolChunks).toHaveLength(2)
    expect(toolChunks[0].toolCall).toEqual({ id: 'tc-1', name: 'tool_a', input: { x: 1 } })
    expect(toolChunks[1].toolCall).toEqual({ id: 'tc-2', name: 'tool_b', input: { y: 2 } })
  })

  it('handles mixed text and tool use in same stream', async () => {
    const sseEvents = [
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Let me search.' } }),
      JSON.stringify({ type: 'content_block_start', index: 1, content_block: { type: 'tool_use', id: 'tc-1', name: 'search' } }),
      JSON.stringify({ type: 'content_block_delta', index: 1, delta: { type: 'input_json_delta', partial_json: '{"q":"test"}' } }),
      JSON.stringify({ type: 'content_block_stop', index: 1 }),
      JSON.stringify({ type: 'message_delta', usage: { input_tokens: 10, output_tokens: 5 } }),
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream(
      [{ role: 'user', content: 'search' }],
      [{ name: 'search', description: '', parameters: {} }],
      undefined
    ))

    expect(chunks.some(c => c.type === 'text_delta' && c.text === 'Let me search.')).toBe(true)
    expect(chunks.some(c => c.type === 'tool_use' && c.toolCall?.name === 'search')).toBe(true)
  })

  it('skips malformed SSE JSON gracefully', async () => {
    const sseEvents = [
      'not-valid-json',
      JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'ok' } }),
      '{"incomplete json',
      JSON.stringify({ type: 'message_delta', usage: { input_tokens: 5, output_tokens: 2 } }),
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream([{ role: 'user', content: 'test' }], [], undefined))

    const textChunks = chunks.filter(c => c.type === 'text_delta')
    expect(textChunks).toHaveLength(1)
    expect(textChunks[0].text).toBe('ok')
  })

  it('sends correct headers and body to fetch', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream([JSON.stringify({ type: 'message_delta', usage: {} })]),
    })

    const provider = await createProvider()
    await collect(provider.stream([{ role: 'user', content: 'hi' }], [], 'Be helpful.'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/v1/messages')
    expect(opts.method).toBe('POST')
    expect(opts.headers['x-api-key']).toBe('sk-ant-test123')
    expect(opts.headers['anthropic-version']).toBe('2023-06-01')

    const body = JSON.parse(opts.body)
    expect(body.stream).toBe(true)
    expect(body.system).toBe('Be helpful.')
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }])
  })

  it('throws on non-OK HTTP response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    })

    const provider = await createProvider()
    const gen = provider.stream([{ role: 'user', content: 'hi' }], [], undefined)
    await expect(collect(gen)).rejects.toThrow('Anthropic API error 401')
  })
})

// --- OpenAI Provider SSE Parsing ---

describe('DBB-003: OpenAI provider stream() SSE parsing', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function createProvider() {
    const { createOpenAIProvider } = await import('../packages/agentic-core/src/providers/openai.js')
    return createOpenAIProvider({ apiKey: 'sk-test123' })
  }

  it('yields text_delta chunks from SSE stream', async () => {
    const sseEvents = [
      JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }),
      JSON.stringify({ choices: [{ delta: { content: ' world' } }] }),
      JSON.stringify({ choices: [{ finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5 } }),
      '[DONE]',
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream([{ role: 'user', content: 'hi' }], [], undefined))

    const textChunks = chunks.filter(c => c.type === 'text_delta')
    expect(textChunks).toHaveLength(2)
    expect(textChunks[0].text).toBe('Hello')
    expect(textChunks[1].text).toBe(' world')

    const stop = chunks.find(c => c.type === 'message_stop')
    expect(stop).toBeDefined()
  })

  it('yields tool_use chunks with accumulated arguments', async () => {
    const event1 = `{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call-1","function":{"name":"calc","arguments":"{\\"ex"}}]}}]}`
    const event2 = `{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"pr\\":\\"2+2\\"}"}}]},"finish_reason":"tool_calls"}]}`
    const sseEvents = [event1, event2]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream(
      [{ role: 'user', content: 'calc' }],
      [{ name: 'calc', description: '', parameters: {} }],
      undefined
    ))

    const toolChunks = chunks.filter(c => c.type === 'tool_use')
    expect(toolChunks).toHaveLength(1)
    expect(toolChunks[0].toolCall).toEqual({ id: 'call-1', name: 'calc', input: { expr: '2+2' } })
  })

  it('handles multiple tool calls in same round', async () => {
    // NOTE: finish_reason must be in the SAME event as delta (OpenAI provider
    // skips events without delta before checking finish_reason)
    const sseEvents = [
      JSON.stringify({ choices: [{ delta: { tool_calls: [
        { index: 0, id: 'c1', function: { name: 'tool_a', arguments: '{"x":1}' } },
        { index: 1, id: 'c2', function: { name: 'tool_b', arguments: '{"y":2}' } },
      ] }, finish_reason: 'tool_calls' }] }),
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream(
      [{ role: 'user', content: 'multi' }],
      [{ name: 'tool_a', description: '', parameters: {} }, { name: 'tool_b', description: '', parameters: {} }],
      undefined
    ))

    const toolChunks = chunks.filter(c => c.type === 'tool_use')
    expect(toolChunks).toHaveLength(2)
    expect(toolChunks[0].toolCall?.name).toBe('tool_a')
    expect(toolChunks[1].toolCall?.name).toBe('tool_b')
  })

  it('skips [DONE] sentinel without yielding', async () => {
    const sseEvents = [
      JSON.stringify({ choices: [{ delta: { content: 'hi' } }] }),
      '[DONE]',
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream([{ role: 'user', content: 'test' }], [], undefined))

    const textChunks = chunks.filter(c => c.type === 'text_delta')
    expect(textChunks).toHaveLength(1)
    // [DONE] should not produce any chunk
    expect(chunks.filter(c => c.type === 'message_stop')).toHaveLength(0)
  })

  it('skips malformed JSON gracefully', async () => {
    const sseEvents = [
      'not-json-at-all',
      JSON.stringify({ choices: [{ delta: { content: 'ok' } }] }),
      '{broken json',
      JSON.stringify({ choices: [{ finish_reason: 'stop' }] }),
    ]

    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream(sseEvents),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream([{ role: 'user', content: 'test' }], [], undefined))

    const textChunks = chunks.filter(c => c.type === 'text_delta')
    expect(textChunks).toHaveLength(1)
    expect(textChunks[0].text).toBe('ok')
  })

  it('sends correct headers and body to fetch', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStream([JSON.stringify({ choices: [{ finish_reason: 'stop' }] })]),
    })

    const provider = await createProvider()
    await collect(provider.stream([{ role: 'user', content: 'hi' }], [], 'Be concise.'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toContain('/v1/chat/completions')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Authorization']).toBe('Bearer sk-test123')

    const body = JSON.parse(opts.body)
    expect(body.stream).toBe(true)
    expect(body.messages[0]).toEqual({ role: 'system', content: 'Be concise.' })
    expect(body.messages[1]).toEqual({ role: 'user', content: 'hi' })
  })

  it('throws on non-OK HTTP response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve('Forbidden'),
    })

    const provider = await createProvider()
    const gen = provider.stream([{ role: 'user', content: 'hi' }], [], undefined)
    await expect(collect(gen)).rejects.toThrow('OpenAI API error 403')
  })

  it('handles real-world chunked delivery (SSE split across buffer boundaries)', async () => {
    // Simulate SSE data arriving in small pieces
    const sseText = [
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'Hello' } }] }) + '\n\n',
      'data: ' + JSON.stringify({ choices: [{ delta: { content: ' world' } }] }) + '\n\n',
      'data: [DONE]\n\n',
    ].join('')

    // Deliver in 10-byte chunks to force buffer splitting
    fetchMock.mockResolvedValue({
      ok: true,
      body: sseStreamChunked(sseText, 10),
    })

    const provider = await createProvider()
    const chunks = await collect(provider.stream([{ role: 'user', content: 'hi' }], [], undefined))

    const textChunks = chunks.filter(c => c.type === 'text_delta')
    expect(textChunks).toHaveLength(2)
    expect(textChunks[0].text).toBe('Hello')
    expect(textChunks[1].text).toBe(' world')
  })
})
