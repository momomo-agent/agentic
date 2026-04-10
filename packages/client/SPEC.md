# AgenticClient — SDK Spec

## 一句话

连接 agentic-service 的 JavaScript SDK，以能力（think/listen/speak/see/converse）为接口，跨浏览器/Node/Electron。

## 安装

```bash
npm install agentic-client
```

```html
<script src="https://unpkg.com/agentic-client/agentic-client.js"></script>
```

## 用法

```js
import { AgenticClient } from 'agentic-client'

const ai = new AgenticClient('http://localhost:1234')

// 能力检测
const caps = await ai.capabilities()
// → { think: true, listen: true, speak: true, see: true, converse: true }

// 思考（LLM）
const answer = await ai.think('分析这段代码')
// streaming
for await (const chunk of ai.think('讲个故事', { stream: true })) {
  process.stdout.write(chunk.text)
}

// 结构化输出
const data = await ai.think('提取：张三28岁北京', {
  schema: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'number' }, city: { type: 'string' } } }
})

// 工具调用
const result = await ai.think('北京天气', {
  tools: [{ name: 'get_weather', description: '获取天气', parameters: { type: 'object', properties: { city: { type: 'string' } } } }]
})
// result.toolCalls → [{ name: 'get_weather', args: { city: '北京' } }]

// 听（STT）
const text = await ai.listen(audioBlob)

// 说（TTS）
const audio = await ai.speak('你好世界')
// 浏览器：返回 AudioBuffer，可直接播放
// Node：返回 Buffer（WAV）

// 看（Vision）
const desc = await ai.see(imageBlob, '描述这张图片')
// streaming
for await (const chunk of ai.see(imageBlob, '描述', { stream: true })) {
  process.stdout.write(chunk.text)
}

// 对话（听→想→说，全链路）
const audio = await ai.converse(audioBlob)

// 管理
ai.admin.status()    // → { hardware, config, ollama, devices, download }
ai.admin.config()    // → 当前配置
ai.admin.config(newConfig) // → 更新配置
ai.admin.models()    // → Ollama 模型列表
ai.admin.pullModel('gemma4:26b', onProgress) // → 拉模型（SSE 进度）
ai.admin.deleteModel('qwen3:0.6b')
ai.admin.logs()      // → 最近日志
ai.admin.perf()      // → 性能指标
ai.admin.devices()   // → 已连接设备
```

## 架构

```
agentic-client/
├── agentic-client.js    # UMD 入口（浏览器 + Node 通用）
├── package.json
├── README.md
├── SPEC.md              # 本文件
├── src/
│   ├── client.js        # AgenticClient 主类
│   ├── capabilities.js  # 能力检测
│   ├── think.js         # LLM 能力（chat/structured/tools）
│   ├── listen.js        # STT 能力
│   ├── speak.js         # TTS 能力
│   ├── see.js           # Vision 能力
│   ├── converse.js      # 全链路语音对话
│   ├── admin.js         # 管理接口
│   ├── transport.js     # HTTP/SSE 传输层
│   └── adapters/
│       ├── browser.js   # 浏览器适配（fetch + Web Audio）
│       └── node.js      # Node 适配（http + Buffer）
└── test/
    └── client.test.js
```

## 模块详细设计

### 1. client.js — 主类

```js
class AgenticClient {
  constructor(baseUrl, options = {}) {
    // baseUrl: agentic-service 地址，如 'http://localhost:1234'
    // options.adapter: 'browser' | 'node' | 'auto'（默认 auto，自动检测环境）
    // options.timeout: 请求超时毫秒数，默认 30000
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.options = { adapter: 'auto', timeout: 30000, ...options }
    this.transport = createTransport(this.baseUrl, this.options)
    this.admin = new Admin(this.transport)
  }

  async capabilities() → { think, listen, speak, see, converse }
  async think(input, options?) → string | AsyncGenerator | { answer, toolCalls?, data? }
  async listen(audio) → string
  async speak(text) → AudioBuffer | Buffer
  async see(image, prompt?, options?) → string | AsyncGenerator
  async converse(audio) → AudioBuffer | Buffer
}
```

### 2. transport.js — 传输层

统一封装 HTTP 请求和 SSE 流，屏蔽浏览器/Node 差异。

```js
function createTransport(baseUrl, options) {
  // auto 检测：typeof window !== 'undefined' → browser，否则 node
  const adapter = resolveAdapter(options.adapter)
  return {
    // JSON 请求
    async get(path) → object
    async post(path, body) → object
    async put(path, body) → object
    async del(path) → object

    // SSE 流式请求
    async *stream(path, body) → AsyncGenerator<{ type, text?, ... }>

    // 二进制请求（音频）
    async postBinary(path, body) → ArrayBuffer | Buffer
    async postFormData(path, formData) → object
  }
}
```

### 3. think.js — LLM 能力

对接 `/api/chat` 端点。

```js
async function think(transport, input, options = {}) {
  // input: string（单条消息）或 Array<{ role, content }>（多轮对话）
  // options.stream: boolean — 是否流式返回
  // options.schema: object — JSON Schema，要求结构化输出
  // options.tools: Array<{ name, description, parameters }> — 工具定义
  // options.history: Array<{ role, content }> — 对话历史
  // options.sessionId: string — 会话 ID（服务端维护历史）

  const body = {}

  if (typeof input === 'string') {
    body.message = input
  } else {
    body.messages = input
  }

  if (options.history) body.history = options.history
  if (options.sessionId) body.sessionId = options.sessionId
  if (options.tools) {
    body.tools = options.tools.map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters || { type: 'object', properties: {} } }
    }))
  }

  // 流式模式
  if (options.stream) {
    return streamThink(transport, body)
    // yield { type: 'content', text: '...' }
    // yield { type: 'tool_use', name: '...', args: {...} }
    // yield { type: 'done' }
  }

  // 非流式：收集所有 chunk
  let text = ''
  const toolCalls = []
  for await (const chunk of transport.stream('/api/chat', body)) {
    if (chunk.type === 'content') text += chunk.text || ''
    if (chunk.type === 'tool_use') toolCalls.push({ name: chunk.name, args: chunk.input || {} })
  }

  const result = { answer: text }
  if (toolCalls.length) result.toolCalls = toolCalls

  // 结构化输出：从 answer 中解析 JSON
  if (options.schema) {
    try {
      result.data = JSON.parse(text)
    } catch {
      // 尝试从 markdown code block 中提取
      const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (match) result.data = JSON.parse(match[1].trim())
    }
  }

  return result
}

async function* streamThink(transport, body) {
  for await (const chunk of transport.stream('/api/chat', body)) {
    if (chunk.type === 'content') yield { type: 'content', text: chunk.text || '' }
    else if (chunk.type === 'tool_use') yield { type: 'tool_use', name: chunk.name, args: chunk.input || {} }
  }
  yield { type: 'done' }
}
```

### 4. listen.js — STT 能力

对接 `/api/transcribe` 端点。

```js
async function listen(transport, audio) {
  // audio: Blob（浏览器）| Buffer（Node）| ArrayBuffer
  // 返回: string（转写文本）

  const formData = createFormData()
  formData.append('audio', audio, 'audio.wav')

  const result = await transport.postFormData('/api/transcribe', formData)
  if (result.skipped) return '' // VAD 检测无语音
  return result.text
}
```

### 5. speak.js — TTS 能力

对接 `/api/synthesize` 端点。

```js
async function speak(transport, text) {
  // text: string
  // 返回: ArrayBuffer（浏览器可转 AudioBuffer）| Buffer（Node）

  const audioData = await transport.postBinary('/api/synthesize', { text })
  return audioData
}
```

### 6. see.js — Vision 能力

对接 `/api/vision` 端点。

```js
async function see(transport, image, prompt = '描述这张图片', options = {}) {
  // image: Blob | Buffer | ArrayBuffer | string（base64）
  // prompt: string
  // options.stream: boolean

  // 将 image 转为 base64
  const base64 = await toBase64(image)
  const body = { image: base64, prompt }

  if (options.stream) {
    return streamSee(transport, body)
  }

  let text = ''
  for await (const chunk of transport.stream('/api/vision', body)) {
    if (chunk.type === 'content') text += chunk.text || ''
  }
  return text
}

async function* streamSee(transport, body) {
  for await (const chunk of transport.stream('/api/vision', body)) {
    if (chunk.type === 'content') yield { type: 'content', text: chunk.text || '' }
  }
  yield { type: 'done' }
}
```

### 7. converse.js — 全链路语音对话

对接 `/api/voice` 端点。

```js
async function converse(transport, audio) {
  // audio: Blob | Buffer | ArrayBuffer
  // 返回: ArrayBuffer | Buffer（WAV 音频）

  const formData = createFormData()
  formData.append('audio', audio, 'audio.wav')

  const audioData = await transport.postBinaryFormData('/api/voice', formData)
  return audioData
}
```

### 8. admin.js — 管理接口

```js
class Admin {
  constructor(transport) {
    this.transport = transport
  }

  async status() {
    // GET /api/status
    return this.transport.get('/api/status')
  }

  async config(newConfig?) {
    // 无参数: GET /api/config
    // 有参数: PUT /api/config
    if (newConfig) return this.transport.put('/api/config', newConfig)
    return this.transport.get('/api/config')
  }

  async models() {
    // GET /api/status → ollama.models
    const status = await this.transport.get('/api/status')
    return status.ollama?.models || []
  }

  async *pullModel(model, onProgress?) {
    // POST /api/models/pull → SSE 进度流
    for await (const chunk of this.transport.stream('/api/models/pull', { model })) {
      if (onProgress) onProgress(chunk)
      yield chunk
    }
  }

  async deleteModel(name) {
    // DELETE /api/models/:name
    return this.transport.del(`/api/models/${encodeURIComponent(name)}`)
  }

  async logs(limit = 50) {
    // GET /api/logs
    return this.transport.get('/api/logs')
  }

  async perf() {
    // GET /api/perf
    return this.transport.get('/api/perf')
  }

  async devices() {
    // GET /api/devices
    return this.transport.get('/api/devices')
  }
}
```

### 9. adapters/browser.js — 浏览器适配

```js
// 使用 fetch API
// SSE: fetch + ReadableStream reader
// FormData: 原生 FormData
// 音频: ArrayBuffer → AudioContext.decodeAudioData

export function createBrowserAdapter(baseUrl, options) {
  const timeout = options.timeout || 30000

  return {
    async get(path) {
      const res = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(timeout) })
      if (!res.ok) throw new AgenticError(res.status, await res.text())
      return res.json()
    },

    async post(path, body) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout)
      })
      if (!res.ok) throw new AgenticError(res.status, await res.text())
      return res.json()
    },

    async put(path, body) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout)
      })
      if (!res.ok) throw new AgenticError(res.status, await res.text())
      return res.json()
    },

    async del(path) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(timeout)
      })
      if (!res.ok) throw new AgenticError(res.status, await res.text())
      return res.json()
    },

    async *stream(path, body) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
        // 不设 timeout，流式请求可能很长
      })
      if (!res.ok) throw new AgenticError(res.status, await res.text())

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // 保留不完整的行
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') return
          try { yield JSON.parse(data) } catch {}
        }
      }
    },

    async postBinary(path, body) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout)
      })
      if (!res.ok) throw new AgenticError(res.status, await res.text())
      return res.arrayBuffer()
    },

    async postFormData(path, formData) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(timeout)
      })
      if (!res.ok) throw new AgenticError(res.status, await res.text())
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('audio/') || ct.includes('application/octet-stream')) {
        return res.arrayBuffer()
      }
      return res.json()
    },

    async postBinaryFormData(path, formData) {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(timeout)
      })
      if (!res.ok) throw new AgenticError(res.status, await res.text())
      return res.arrayBuffer()
    }
  }
}
```

### 10. adapters/node.js — Node 适配

```js
// 使用 Node 内置 fetch（Node 18+）
// FormData: 使用 undici 或 node:FormData（Node 18+）
// 音频: 返回 Buffer

export function createNodeAdapter(baseUrl, options) {
  // 与 browser adapter 接口完全一致
  // 区别：
  // 1. postBinary 返回 Buffer 而非 ArrayBuffer
  // 2. FormData 使用 Node 内置实现
  // 3. 可选支持 http.Agent（keepAlive、proxy 等）

  // 实现与 browser.js 几乎相同（Node 18+ 有 fetch/FormData）
  // 唯一区别：postBinary 返回 Buffer.from(await res.arrayBuffer())
}
```

## 错误处理

```js
class AgenticError extends Error {
  constructor(status, message, code) {
    super(message)
    this.name = 'AgenticError'
    this.status = status    // HTTP 状态码
    this.code = code        // 业务错误码（可选）
  }
}

// 错误码约定：
// 400 — 参数错误（缺 audio、缺 text 等）
// 404 — 服务不可用（Ollama 没跑、模型没下载）
// 500 — 服务内部错误
// TIMEOUT — 请求超时
// NETWORK — 网络不可达
```

## 工具函数

```js
// toBase64(input) — 将各种图片格式转为 base64 字符串
// input: Blob | Buffer | ArrayBuffer | string（已是 base64 则直接返回）
// 浏览器: FileReader.readAsDataURL → 去掉 data:...;base64, 前缀
// Node: Buffer.from(input).toString('base64')

// createFormData() — 跨平台 FormData
// 浏览器: new FormData()
// Node: new FormData()（Node 18+ 内置）
```

## package.json

```json
{
  "name": "agentic-client",
  "version": "0.1.0",
  "type": "module",
  "description": "JavaScript SDK for agentic-service — think, listen, speak, see, converse",
  "main": "agentic-client.js",
  "module": "src/client.js",
  "exports": {
    ".": {
      "import": "./src/client.js",
      "require": "./agentic-client.js"
    }
  },
  "files": ["src/", "agentic-client.js", "README.md"],
  "keywords": ["ai", "llm", "sdk", "local-first", "agentic"],
  "license": "MIT",
  "engines": { "node": ">=18" },
  "devDependencies": {
    "vitest": "^3.0.0",
    "esbuild": "^0.25.0"
  },
  "scripts": {
    "build": "esbuild src/client.js --bundle --format=iife --global-name=AgenticClient --outfile=agentic-client.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

## UMD 入口 (agentic-client.js)

esbuild 打包 src/client.js 为 IIFE，暴露 `window.AgenticClient`。

浏览器用 `<script>` 引入后：
```js
const ai = new AgenticClient('http://localhost:1234')
```

Node 用 ESM import：
```js
import { AgenticClient } from 'agentic-client'
```

## 测试计划

用 vitest，mock transport 层测试每个能力模块：

```js
// test/client.test.js
describe('AgenticClient', () => {
  describe('think', () => {
    it('非流式返回 answer 字符串')
    it('流式返回 AsyncGenerator')
    it('结构化输出解析 JSON')
    it('工具调用返回 toolCalls')
    it('支持多轮对话 history')
    it('支持 sessionId')
  })

  describe('listen', () => {
    it('发送音频返回文本')
    it('VAD 跳过返回空字符串')
  })

  describe('speak', () => {
    it('发送文本返回音频数据')
  })

  describe('see', () => {
    it('非流式返回描述文本')
    it('流式返回 AsyncGenerator')
    it('支持 base64 字符串输入')
    it('支持 Blob 输入')
  })

  describe('converse', () => {
    it('发送音频返回音频')
  })

  describe('admin', () => {
    it('status 返回系统状态')
    it('config 无参数返回配置')
    it('config 有参数更新配置')
    it('models 返回模型列表')
    it('pullModel 返回进度流')
    it('deleteModel 删除模型')
    it('logs 返回日志')
    it('perf 返回性能指标')
    it('devices 返回设备列表')
  })

  describe('capabilities', () => {
    it('从 /api/status 推断能力')
    it('Ollama 没跑时 think=false')
    it('STT 没配时 listen=false')
  })

  describe('transport', () => {
    it('自动检测浏览器/Node 环境')
    it('SSE 流正确解析 data: 行')
    it('SSE 流处理 [DONE] 终止')
    it('超时抛出 AgenticError')
    it('网络错误抛出 AgenticError')
  })

  describe('errors', () => {
    it('400 参数错误')
    it('500 服务错误')
    it('网络不可达')
    it('超时')
  })
})
```

## 与 agentic 家族的关系

AgenticClient 是 agentic-service 的 SDK，不依赖其他 agentic 包。

```
agentic-service（服务端）
    ↑ HTTP/SSE/WS
agentic-client（SDK）
    ↑ 被引用
浏览器 App / Node 脚本 / Electron App
```

agentic-client 只做一件事：把 agentic-service 的 HTTP API 包装成好用的 JS 接口。

## 实施顺序

1. 创建 `packages/client/` 目录和 package.json
2. 实现 transport.js（browser adapter 优先，Node 18+ fetch 几乎一样）
3. 实现 think.js（最核心的能力）
4. 实现 speak.js + listen.js（简单的 POST）
5. 实现 see.js（SSE 流式）
6. 实现 converse.js（FormData + 二进制返回）
7. 实现 admin.js（纯 REST）
8. 实现 capabilities.js
9. 组装 client.js 主类
10. esbuild 打包 UMD
11. 写测试
12. 写 README.md

## 约束

- 零运行时依赖（只用浏览器/Node 内置 API）
- Node >= 18（内置 fetch + FormData）
- 文件名统一 kebab-case
- 遵循 agentic 家族 UMD wrapper 约定
- 所有异步方法返回 Promise，流式返回 AsyncGenerator
- 错误统一用 AgenticError
