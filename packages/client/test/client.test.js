import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgenticClient, AgenticError } from '../src/client.js'
import { createTransport } from '../src/transport.js'

// --- Mock transport factory ---
function mockTransport(overrides = {}) {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    stream: vi.fn(),
    postBinary: vi.fn(),
    postFormData: vi.fn(),
    baseUrl: 'http://localhost:1234',
    ...overrides
  }
}

// Helper: create async generator from array
async function* asyncGen(items) {
  for (const item of items) yield item
}

// Patch client with mock transport
function createClient(transportOverrides = {}) {
  const client = new AgenticClient('http://localhost:1234')
  const transport = mockTransport(transportOverrides)
  client.transport = transport
  client.admin.transport = transport
  return { client, transport }
}

// ============================================================
// think
// ============================================================
describe('think', () => {
  it('非流式返回 answer 字符串', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'content', text: 'Hello ' },
        { type: 'content', text: 'world' }
      ]))
    })
    const result = await client.think('hi')
    expect(result.answer).toBe('Hello world')
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', { message: 'hi' })
  })

  it('流式返回 AsyncGenerator (ChatEvent format)', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'content', text: 'chunk1' },
        { type: 'content', text: 'chunk2' }
      ]))
    })
    const gen = await client.think('hi', { stream: true })
    const chunks = []
    for await (const c of gen) chunks.push(c)
    expect(chunks).toEqual([
      { type: 'text_delta', text: 'chunk1' },
      { type: 'text_delta', text: 'chunk2' },
      { type: 'done', stopReason: 'end_turn' }
    ])
  })

  it('结构化输出解析 JSON', async () => {
    const json = '{"name":"张三","age":28,"city":"北京"}'
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: json }]))
    })
    const result = await client.think('提取', {
      schema: { type: 'object', properties: { name: { type: 'string' } } }
    })
    expect(result.data).toEqual({ name: '张三', age: 28, city: '北京' })
  })

  it('结构化输出从 markdown code block 提取', async () => {
    const text = 'Here is the data:\n```json\n{"x":1}\n```'
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text }]))
    })
    const result = await client.think('提取', { schema: {} })
    expect(result.data).toEqual({ x: 1 })
  })

  it('tool_use 事件正确收集', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'tool_use', id: 'call_1', name: 'get_time', input: {} },
        { type: 'content', text: '现在是下午3点' }
      ]))
    })
    const result = await client.think('几点了', {
      tools: [{ name: 'get_time', description: '获取时间' }]
    })
    expect(result.toolCalls).toEqual([{ id: 'call_1', name: 'get_time', args: {} }])
    expect(result.answer).toBe('现在是下午3点')
  })

  it('messages 数组格式', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    const messages = [{ role: 'user', content: 'hi' }]
    await client.think(messages)
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', { messages })
  })

  it('传递 model/temperature/maxTokens', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.think('hi', { model: 'gemma3:4b', temperature: 0.5, maxTokens: 100 })
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', {
      message: 'hi', model: 'gemma3:4b', temperature: 0.5, max_tokens: 100
    })
  })

  it('tools 自动包装为 OpenAI function 格式', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.think('hi', {
      tools: [{ name: 'calc', description: '计算', parameters: { type: 'object', properties: { expr: { type: 'string' } } } }]
    })
    const call = transport.stream.mock.calls[0][1]
    expect(call.tools[0]).toEqual({
      type: 'function',
      function: { name: 'calc', description: '计算', parameters: { type: 'object', properties: { expr: { type: 'string' } } } }
    })
  })
})

// ============================================================
// listen
// ============================================================
describe('listen', () => {
  it('发送 FormData 到 /api/transcribe', async () => {
    const { client, transport } = createClient({
      postFormData: vi.fn().mockResolvedValue({ text: '你好世界' })
    })
    const blob = new Blob(['fake audio'], { type: 'audio/webm' })
    const text = await client.listen(blob)
    expect(text).toBe('你好世界')
    expect(transport.postFormData).toHaveBeenCalledWith('/api/transcribe', expect.any(FormData))
  })

  it('传递 language 参数', async () => {
    const { client, transport } = createClient({
      postFormData: vi.fn().mockResolvedValue({ text: '你好' })
    })
    const blob = new Blob(['fake'], { type: 'audio/webm' })
    await client.listen(blob, { language: 'zh' })
    const fd = transport.postFormData.mock.calls[0][1]
    expect(fd.get('language')).toBe('zh')
  })

  it('返回纯字符串时直接返回', async () => {
    const { client } = createClient({
      postFormData: vi.fn().mockResolvedValue('hello world')
    })
    const blob = new Blob(['fake'], { type: 'audio/webm' })
    const text = await client.listen(blob)
    expect(text).toBe('hello world')
  })
})

// ============================================================
// speak
// ============================================================
describe('speak', () => {
  it('发送文本到 /api/synthesize 返回音频', async () => {
    const audioData = new ArrayBuffer(100)
    const { client, transport } = createClient({
      postBinary: vi.fn().mockResolvedValue(audioData)
    })
    const result = await client.speak('你好')
    expect(result).toBe(audioData)
    expect(transport.postBinary).toHaveBeenCalledWith('/api/synthesize', { text: '你好' })
  })

  it('传递 voice 和 speed 参数', async () => {
    const { client, transport } = createClient({
      postBinary: vi.fn().mockResolvedValue(new ArrayBuffer(10))
    })
    await client.speak('hello', { voice: 'nova', speed: 1.2 })
    expect(transport.postBinary).toHaveBeenCalledWith('/api/synthesize', {
      text: 'hello', voice: 'nova', speed: 1.2
    })
  })
})

// ============================================================
// see
// ============================================================
describe('see', () => {
  it('URL 图片 + prompt', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: '一只猫' }]))
    })
    const result = await client.see('http://example.com/cat.jpg', '这是什么')
    expect(result.answer).toBe('一只猫')
    expect(transport.stream).toHaveBeenCalledWith('/api/vision', {
      image: 'http://example.com/cat.jpg',
      prompt: '这是什么'
    })
  })

  it('base64 自动加 data: 前缀', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.see('iVBORw0KGgo=', 'describe')
    const call = transport.stream.mock.calls[0][1]
    expect(call.image).toBe('data:image/jpeg;base64,iVBORw0KGgo=')
  })

  it('data: URI 直接传递', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.see('data:image/png;base64,abc123', 'describe')
    const call = transport.stream.mock.calls[0][1]
    expect(call.image).toBe('data:image/png;base64,abc123')
  })

  it('默认 prompt', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.see('http://example.com/img.jpg')
    const call = transport.stream.mock.calls[0][1]
    expect(call.prompt).toBe('Describe this image.')
  })

  it('流式模式', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'content', text: 'a ' },
        { type: 'content', text: 'cat' }
      ]))
    })
    const gen = client.see('http://example.com/cat.jpg', 'what', { stream: true })
    const chunks = []
    for await (const c of gen) chunks.push(c)
    expect(chunks).toEqual([
      { type: 'text_delta', text: 'a ' },
      { type: 'text_delta', text: 'cat' },
      { type: 'done', stopReason: 'end_turn' }
    ])
  })
})

// ============================================================
// converse
// ============================================================
describe('converse', () => {
  it('发送音频返回 text + audio', async () => {
    const { client, transport } = createClient({
      postFormData: vi.fn().mockResolvedValue({ text: '你好', audio: 'base64audio' })
    })
    const blob = new Blob(['fake'], { type: 'audio/webm' })
    const result = await client.converse(blob)
    expect(result.text).toBe('你好')
    expect(result.audio).toBe('base64audio')
    expect(transport.postFormData).toHaveBeenCalledWith('/api/voice', expect.any(FormData))
  })

  it('传递 voice/model/sessionId', async () => {
    const { client, transport } = createClient({
      postFormData: vi.fn().mockResolvedValue({ text: 'ok', audio: null })
    })
    const blob = new Blob(['fake'], { type: 'audio/webm' })
    await client.converse(blob, { voice: 'nova', model: 'gemma3', sessionId: 'abc' })
    const fd = transport.postFormData.mock.calls[0][1]
    expect(fd.get('voice')).toBe('nova')
    expect(fd.get('model')).toBe('gemma3')
    expect(fd.get('sessionId')).toBe('abc')
  })
})

// ============================================================
// embed
// ============================================================
describe('embed', () => {
  it('单个文本返回 embeddings 数组', async () => {
    const { client, transport } = createClient({
      post: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
        model: 'nomic-embed-text',
        usage: { prompt_tokens: 3 }
      })
    })
    const result = await client.embed('hello')
    expect(result.embeddings).toEqual([[0.1, 0.2, 0.3]])
    expect(result.model).toBe('nomic-embed-text')
    expect(transport.post).toHaveBeenCalledWith('/v1/embeddings', { input: ['hello'] })
  })

  it('多个文本批量嵌入', async () => {
    const { client, transport } = createClient({
      post: vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1] }, { embedding: [0.2] }],
        model: 'nomic-embed-text'
      })
    })
    const result = await client.embed(['hello', 'world'])
    expect(result.embeddings).toEqual([[0.1], [0.2]])
    expect(transport.post).toHaveBeenCalledWith('/v1/embeddings', { input: ['hello', 'world'] })
  })

  it('传递 model 参数', async () => {
    const { client, transport } = createClient({
      post: vi.fn().mockResolvedValue({ data: [{ embedding: [0.1] }] })
    })
    await client.embed('hi', { model: 'bge-m3' })
    expect(transport.post).toHaveBeenCalledWith('/v1/embeddings', { input: ['hi'], model: 'bge-m3' })
  })
})

// ============================================================
// admin
// ============================================================
describe('admin', () => {
  it('status 调用 GET /api/status', async () => {
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue({ ollama: { running: true } })
    })
    const result = await client.admin.status()
    expect(transport.get).toHaveBeenCalledWith('/api/status')
    expect(result.ollama.running).toBe(true)
  })

  it('config GET', async () => {
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue({ model: 'gemma3:4b' })
    })
    const result = await client.admin.config()
    expect(transport.get).toHaveBeenCalledWith('/api/config')
  })

  it('config PUT', async () => {
    const { client, transport } = createClient({
      put: vi.fn().mockResolvedValue({ ok: true })
    })
    await client.admin.config({ model: 'qwen3:8b' })
    expect(transport.put).toHaveBeenCalledWith('/api/config', { model: 'qwen3:8b' })
  })

  it('engines 列表', async () => {
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue([{ name: 'ollama', status: 'running' }])
    })
    const result = await client.admin.engines()
    expect(transport.get).toHaveBeenCalledWith('/api/engines')
  })

  it('engineModels 带 engine 参数', async () => {
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue([])
    })
    await client.admin.engineModels('ollama')
    expect(transport.get).toHaveBeenCalledWith('/api/engines/models?engine=ollama')
  })

  it('pullModel 流式下载', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([
        { status: 'pulling', progress: 50 },
        { status: 'success', progress: 100 }
      ]))
    })
    const chunks = []
    for await (const c of client.admin.pullModel('gemma3:4b')) chunks.push(c)
    expect(chunks).toHaveLength(2)
    expect(transport.stream).toHaveBeenCalledWith('/api/engines/pull', { model: 'gemma3:4b' })
  })

  it('deleteModel', async () => {
    const { client, transport } = createClient({
      del: vi.fn().mockResolvedValue({ ok: true })
    })
    await client.admin.deleteModel('gemma3:4b')
    expect(transport.del).toHaveBeenCalledWith('/api/engines/models/gemma3%3A4b')
  })

  it('models 列表 (OpenAI 兼容)', async () => {
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue({ data: [{ id: 'gemma3:4b' }] })
    })
    await client.admin.models()
    expect(transport.get).toHaveBeenCalledWith('/v1/models')
  })

  it('health', async () => {
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue({ status: 'ok' })
    })
    await client.admin.health()
    expect(transport.get).toHaveBeenCalledWith('/api/health')
  })

  it('assignments GET', async () => {
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue({ chat: 'gemma3:4b' })
    })
    await client.admin.assignments()
    expect(transport.get).toHaveBeenCalledWith('/api/assignments')
  })

  it('assignments PUT', async () => {
    const { client, transport } = createClient({
      put: vi.fn().mockResolvedValue({ ok: true })
    })
    await client.admin.setAssignments({ chat: 'qwen3:8b' })
    expect(transport.put).toHaveBeenCalledWith('/api/assignments', { chat: 'qwen3:8b' })
  })
})

// ============================================================
// capabilities
// ============================================================
describe('capabilities', () => {
  it('全部可用', async () => {
    const { client } = createClient({
      get: vi.fn().mockResolvedValue({
        ollama: { running: true, models: [{ name: 'gemma3:4b' }] },
        config: { stt: true, tts: true }
      })
    })
    const caps = await client.capabilities()
    expect(caps.think).toBe(true)
    expect(caps.listen).toBe(true)
    expect(caps.speak).toBe(true)
    expect(caps.see).toBe(true)
    expect(caps.converse).toBe(true)
    expect(caps.embed).toBe(true)
  })

  it('Ollama 没跑时 think/see/embed=false', async () => {
    const { client } = createClient({
      get: vi.fn().mockResolvedValue({
        ollama: { running: false, models: [] },
        config: { stt: true, tts: true }
      })
    })
    const caps = await client.capabilities()
    expect(caps.think).toBe(false)
    expect(caps.see).toBe(false)
    expect(caps.embed).toBe(false)
    expect(caps.converse).toBe(false)
  })

  it('STT 没配时 listen=false', async () => {
    const { client } = createClient({
      get: vi.fn().mockResolvedValue({
        ollama: { running: true, models: [{ name: 'x' }] },
        config: {}
      })
    })
    const caps = await client.capabilities()
    expect(caps.listen).toBe(false)
    expect(caps.converse).toBe(false)
  })
})

// ============================================================
// transport
// ============================================================
describe('transport', () => {
  it('创建 transport 包含所有方法', () => {
    const t = createTransport('http://localhost:1234')
    expect(t).toHaveProperty('get')
    expect(t).toHaveProperty('post')
    expect(t).toHaveProperty('put')
    expect(t).toHaveProperty('del')
    expect(t).toHaveProperty('stream')
    expect(t).toHaveProperty('streamGet')
    expect(t).toHaveProperty('postBinary')
    expect(t).toHaveProperty('postFormData')
  })

  it('SSE 流正确解析 data: 行', async () => {
    const lines = [
      'data: {"type":"content","text":"hello"}\n',
      'data: {"type":"content","text":" world"}\n',
      'data: [DONE]\n'
    ]
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(lines[0]) })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(lines[1]) })
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(lines[2]) })
        .mockResolvedValueOnce({ done: true, value: undefined })
    }
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    })
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      const chunks = []
      for await (const c of t.stream('/api/chat', { message: 'hi' })) {
        chunks.push(c)
      }
      expect(chunks).toEqual([
        { type: 'content', text: 'hello' },
        { type: 'content', text: ' world' }
      ])
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('SSE 流处理 [DONE] 终止', async () => {
    const data = 'data: {"type":"content","text":"a"}\ndata: [DONE]\ndata: {"type":"content","text":"b"}\n'
    const mockReader = {
      read: vi.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(data) })
        .mockResolvedValueOnce({ done: true, value: undefined })
    }
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: () => mockReader }
    })
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      const chunks = []
      for await (const c of t.stream('/api/chat', {})) chunks.push(c)
      expect(chunks).toEqual([{ type: 'content', text: 'a' }])
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('HTTP 错误抛出 AgenticError', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, status: 500, statusText: 'Internal Server Error',
      text: () => Promise.resolve('server error'),
      headers: new Headers({ 'content-type': 'text/plain' })
    })
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      await expect(t.get('/api/status')).rejects.toThrow(AgenticError)
      await expect(t.get('/api/status')).rejects.toMatchObject({ status: 500 })
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('超时抛出 AgenticError', async () => {
    const mockFetch = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234', { timeout: 100 })
      await expect(t.get('/api/status')).rejects.toThrow(AgenticError)
      await expect(t.get('/api/status')).rejects.toMatchObject({ status: 'TIMEOUT' })
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('网络错误抛出 AgenticError', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('fetch failed'))
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      await expect(t.get('/api/status')).rejects.toThrow(AgenticError)
      await expect(t.get('/api/status')).rejects.toMatchObject({ status: 'NETWORK' })
    } finally {
      globalThis.fetch = origFetch
    }
  })
})

// ============================================================
// errors
// ============================================================
describe('errors', () => {
  it('400 参数错误', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, status: 400, statusText: 'Bad Request',
      text: () => Promise.resolve('missing audio field')
    })
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      await expect(t.post('/api/chat', {})).rejects.toMatchObject({
        status: 400, message: 'missing audio field'
      })
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('网络不可达', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      await expect(t.get('/api/status')).rejects.toMatchObject({ status: 'NETWORK' })
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('超时', async () => {
    const mockFetch = vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }))
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      await expect(t.get('/api/status')).rejects.toMatchObject({ status: 'TIMEOUT' })
    } finally {
      globalThis.fetch = origFetch
    }
  })
})

// ============================================================
// AgenticClient constructor
// ============================================================
describe('AgenticClient', () => {
  it('strips trailing slash from baseUrl', () => {
    const client = new AgenticClient('http://localhost:1234/')
    expect(client.baseUrl).toBe('http://localhost:1234')
  })

  it('accepts options object as first arg', () => {
    const client = new AgenticClient({ baseUrl: 'http://localhost:5678' })
    expect(client.baseUrl).toBe('http://localhost:5678')
  })

  it('has admin property', () => {
    const client = new AgenticClient('http://localhost:1234')
    expect(client.admin).toBeDefined()
    expect(typeof client.admin.status).toBe('function')
    expect(typeof client.admin.engines).toBe('function')
    expect(typeof client.admin.pullModel).toBe('function')
  })

  it('has all core methods', () => {
    const client = new AgenticClient('http://localhost:1234')
    expect(typeof client.think).toBe('function')
    expect(typeof client.listen).toBe('function')
    expect(typeof client.speak).toBe('function')
    expect(typeof client.see).toBe('function')
    expect(typeof client.converse).toBe('function')
    expect(typeof client.embed).toBe('function')
    expect(typeof client.capabilities).toBe('function')
  })
})
