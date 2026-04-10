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
    postBinaryFormData: vi.fn(),
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
    const result = await client.think('extract', { schema: { type: 'object' } })
    expect(result.data).toEqual({ x: 1 })
  })

  it('工具调用返回 toolCalls', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'tool_use', id: 'call_1', name: 'get_weather', input: { city: '北京' } }
      ]))
    })
    const result = await client.think('北京天气', {
      tools: [{ name: 'get_weather', description: '获取天气', parameters: { type: 'object', properties: { city: { type: 'string' } } } }]
    })
    expect(result.toolCalls).toEqual([{ id: 'call_1', name: 'get_weather', args: { city: '北京' } }])
  })

  it('支持多轮对话 history', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    const history = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }]
    await client.think('next', { history })
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', {
      message: 'next',
      history
    })
  })

  it('支持 sessionId', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.think('hi', { sessionId: 'abc123' })
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', {
      message: 'hi',
      sessionId: 'abc123'
    })
  })

  it('支持 messages 数组输入', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    const messages = [{ role: 'user', content: 'hi' }]
    await client.think(messages)
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', { messages })
  })
  it('流式 tool_use 事件包含 id/name/input', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'content', text: 'Let me check' },
        { type: 'tool_use', id: 'call_1', name: 'search', input: { q: 'test' } }
      ]))
    })
    const gen = await client.think('search for test', { stream: true })
    const chunks = []
    for await (const c of gen) chunks.push(c)
    expect(chunks).toEqual([
      { type: 'text_delta', text: 'Let me check' },
      { type: 'tool_use', id: 'call_1', name: 'search', input: { q: 'test' } },
      { type: 'done', stopReason: 'end_turn' }
    ])
  })

  it('流式 error 事件', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'error', error: 'model not found' }
      ]))
    })
    const gen = await client.think('hi', { stream: true })
    const chunks = []
    for await (const c of gen) chunks.push(c)
    expect(chunks).toEqual([
      { type: 'error', error: 'model not found' },
      { type: 'done', stopReason: 'end_turn' }
    ])
  })

  it('toolChoice 透传到请求体', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.think('hi', {
      tools: [{ name: 'foo', description: 'bar' }],
      toolChoice: 'auto'
    })
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', {
      message: 'hi',
      tools: [{ type: 'function', function: { name: 'foo', description: 'bar', parameters: { type: 'object', properties: {} } } }],
      tool_choice: 'auto'
    })
  })

  it('接受 OpenAI 格式的 tools 定义', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    const tool = { type: 'function', function: { name: 'foo', description: 'bar', parameters: { type: 'object' } } }
    await client.think('hi', { tools: [tool] })
    expect(transport.stream).toHaveBeenCalledWith('/api/chat', {
      message: 'hi',
      tools: [tool]
    })
  })
})

// ============================================================
// chat (provider routing)
// ============================================================
describe('chat', () => {
  it('throws when no provider matches', () => {
    const client = new AgenticClient({ providers: [] })
    expect(() => client.chat([{ role: 'user', content: 'hi' }], { model: 'gpt-4' }))
      .toThrow('No provider matched')
  })

  it('matches provider by glob pattern', () => {
    const client = new AgenticClient({
      providers: [
        { type: 'anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant', models: ['claude-*'] },
        { type: 'openai', baseUrl: 'https://api.openai.com', apiKey: 'sk-oai', models: ['gpt-*'] },
      ]
    })
    // Should not throw — provider matched
    // We can't easily test the fetch call without mocking global fetch,
    // but we can verify it doesn't throw "no provider matched"
    const result = client.chat([{ role: 'user', content: 'hi' }], { model: 'claude-3-sonnet', stream: false })
    expect(result).toBeInstanceOf(Promise)
  })
})
describe('listen', () => {
  it('发送音频返回文本', async () => {
    const { client, transport } = createClient({
      postFormData: vi.fn().mockResolvedValue({ text: '你好世界' })
    })
    const audio = new Blob(['fake-audio'], { type: 'audio/wav' })
    const text = await client.listen(audio)
    expect(text).toBe('你好世界')
    expect(transport.postFormData).toHaveBeenCalledWith('/api/transcribe', expect.any(FormData))
  })

  it('VAD 跳过返回空字符串', async () => {
    const { client } = createClient({
      postFormData: vi.fn().mockResolvedValue({ skipped: true })
    })
    const audio = new Blob(['silence'], { type: 'audio/wav' })
    const text = await client.listen(audio)
    expect(text).toBe('')
  })
})

// ============================================================
// speak
// ============================================================
describe('speak', () => {
  it('发送文本返回音频数据', async () => {
    const fakeAudio = new ArrayBuffer(100)
    const { client, transport } = createClient({
      postBinary: vi.fn().mockResolvedValue(fakeAudio)
    })
    const result = await client.speak('你好世界')
    expect(result).toBe(fakeAudio)
    expect(transport.postBinary).toHaveBeenCalledWith('/api/synthesize', { text: '你好世界' })
  })
})

// ============================================================
// see
// ============================================================
describe('see', () => {
  it('非流式返回描述文本', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'content', text: 'A cat ' },
        { type: 'content', text: 'sitting' }
      ]))
    })
    const result = await client.see('base64imagedata', 'describe')
    expect(result).toBe('A cat sitting')
  })

  it('流式返回 AsyncGenerator', async () => {
    const { client } = createClient({
      stream: vi.fn(() => asyncGen([
        { type: 'content', text: 'A ' },
        { type: 'content', text: 'dog' }
      ]))
    })
    const gen = await client.see('base64imagedata', 'describe', { stream: true })
    const chunks = []
    for await (const c of gen) chunks.push(c)
    expect(chunks).toEqual([
      { type: 'content', text: 'A ' },
      { type: 'content', text: 'dog' },
      { type: 'done' }
    ])
  })

  it('支持 base64 字符串输入', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    await client.see('aGVsbG8=', 'describe')
    expect(transport.stream).toHaveBeenCalledWith('/api/vision', {
      image: 'aGVsbG8=',
      prompt: 'describe'
    })
  })

  it('支持 ArrayBuffer 输入', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    const buf = new ArrayBuffer(4)
    new Uint8Array(buf).set([1, 2, 3, 4])
    await client.see(buf, 'describe')
    // Should have converted to base64
    const call = transport.stream.mock.calls[0]
    expect(call[0]).toBe('/api/vision')
    expect(typeof call[1].image).toBe('string')
  })

  it('支持 Blob 输入', async () => {
    const { client, transport } = createClient({
      stream: vi.fn(() => asyncGen([{ type: 'content', text: 'ok' }]))
    })
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })
    await client.see(blob, 'describe')
    const call = transport.stream.mock.calls[0]
    expect(call[0]).toBe('/api/vision')
    expect(typeof call[1].image).toBe('string')
  })
})

// ============================================================
// converse
// ============================================================
describe('converse', () => {
  it('发送音频返回音频', async () => {
    const fakeAudio = new ArrayBuffer(200)
    const { client, transport } = createClient({
      postBinaryFormData: vi.fn().mockResolvedValue(fakeAudio)
    })
    const audio = new Blob(['audio-data'], { type: 'audio/wav' })
    const result = await client.converse(audio)
    expect(result).toBe(fakeAudio)
    expect(transport.postBinaryFormData).toHaveBeenCalledWith('/api/voice', expect.any(FormData))
  })
})

// ============================================================
// admin
// ============================================================
describe('admin', () => {
  it('status 返回系统状态', async () => {
    const statusData = { hardware: {}, config: {}, ollama: { running: true } }
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue(statusData)
    })
    const result = await client.admin.status()
    expect(result).toEqual(statusData)
    expect(transport.get).toHaveBeenCalledWith('/api/status')
  })

  it('config 无参数返回配置', async () => {
    const configData = { model: 'gemma4:26b' }
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue(configData)
    })
    const result = await client.admin.config()
    expect(result).toEqual(configData)
    expect(transport.get).toHaveBeenCalledWith('/api/config')
  })

  it('config 有参数更新配置', async () => {
    const newConfig = { model: 'qwen3:8b' }
    const { client, transport } = createClient({
      put: vi.fn().mockResolvedValue({ ok: true })
    })
    const result = await client.admin.config(newConfig)
    expect(result).toEqual({ ok: true })
    expect(transport.put).toHaveBeenCalledWith('/api/config', newConfig)
  })

  it('models 返回模型列表', async () => {
    const models = [{ name: 'gemma4:26b' }, { name: 'qwen3:8b' }]
    const { client } = createClient({
      get: vi.fn().mockResolvedValue({ ollama: { models } })
    })
    const result = await client.admin.models()
    expect(result).toEqual(models)
  })

  it('models 返回空数组当 ollama 未运行', async () => {
    const { client } = createClient({
      get: vi.fn().mockResolvedValue({})
    })
    const result = await client.admin.models()
    expect(result).toEqual([])
  })

  it('pullModel 返回进度流', async () => {
    const progress = [
      { status: 'downloading', progress: 50 },
      { status: 'downloading', progress: 100 },
      { status: 'success' }
    ]
    const onProgress = vi.fn()
    const { client } = createClient({
      stream: vi.fn(() => asyncGen(progress))
    })
    const chunks = []
    for await (const c of client.admin.pullModel('gemma4:26b', onProgress)) {
      chunks.push(c)
    }
    expect(chunks).toEqual(progress)
    expect(onProgress).toHaveBeenCalledTimes(3)
  })

  it('deleteModel 删除模型', async () => {
    const { client, transport } = createClient({
      del: vi.fn().mockResolvedValue({ ok: true })
    })
    await client.admin.deleteModel('qwen3:0.6b')
    expect(transport.del).toHaveBeenCalledWith('/api/models/qwen3%3A0.6b')
  })

  it('logs 返回日志', async () => {
    const logs = [{ ts: 1, msg: 'started' }]
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue(logs)
    })
    const result = await client.admin.logs()
    expect(result).toEqual(logs)
    expect(transport.get).toHaveBeenCalledWith('/api/logs')
  })

  it('perf 返回性能指标', async () => {
    const perf = { tokensPerSec: 42 }
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue(perf)
    })
    const result = await client.admin.perf()
    expect(result).toEqual(perf)
    expect(transport.get).toHaveBeenCalledWith('/api/perf')
  })

  it('devices 返回设备列表', async () => {
    const devices = [{ id: 'mic1', type: 'microphone' }]
    const { client, transport } = createClient({
      get: vi.fn().mockResolvedValue(devices)
    })
    const result = await client.admin.devices()
    expect(result).toEqual(devices)
    expect(transport.get).toHaveBeenCalledWith('/api/devices')
  })
})

// ============================================================
// capabilities
// ============================================================
describe('capabilities', () => {
  it('从 /api/status 推断能力', async () => {
    const { client } = createClient({
      get: vi.fn().mockResolvedValue({
        ollama: { running: true, models: [{ name: 'gemma4' }] },
        config: { stt: true, tts: true }
      })
    })
    const caps = await client.capabilities()
    expect(caps).toEqual({
      think: true, listen: true, speak: true, see: true, converse: true
    })
  })

  it('Ollama 没跑时 think=false', async () => {
    const { client } = createClient({
      get: vi.fn().mockResolvedValue({
        ollama: { running: false, models: [] },
        config: { stt: true, tts: true }
      })
    })
    const caps = await client.capabilities()
    expect(caps.think).toBe(false)
    expect(caps.see).toBe(false)
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
  it('自动检测浏览器/Node 环境', () => {
    // In Node test env, should create without error
    const t = createTransport('http://localhost:1234')
    expect(t).toHaveProperty('get')
    expect(t).toHaveProperty('post')
    expect(t).toHaveProperty('stream')
    expect(t).toHaveProperty('postBinary')
    expect(t).toHaveProperty('postFormData')
    expect(t).toHaveProperty('postBinaryFormData')
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
      // Should stop at [DONE], not yield "b"
      expect(chunks).toEqual([{ type: 'content', text: 'a' }])
    } finally {
      globalThis.fetch = origFetch
    }
  })

  it('超时抛出 AgenticError', async () => {
    const mockFetch = vi.fn().mockRejectedValue(Object.assign(new Error('timeout'), { name: 'TimeoutError' }))
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

  it('500 服务错误', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, status: 500, statusText: 'Internal Server Error',
      text: () => Promise.resolve('internal error')
    })
    const origFetch = globalThis.fetch
    globalThis.fetch = mockFetch
    try {
      const t = createTransport('http://localhost:1234')
      await expect(t.get('/api/status')).rejects.toMatchObject({ status: 500 })
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

  it('has admin property', () => {
    const client = new AgenticClient('http://localhost:1234')
    expect(client.admin).toBeDefined()
    expect(typeof client.admin.status).toBe('function')
  })
})
