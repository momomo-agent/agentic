# Agentic API 对齐文档

## 目标

Client 做胶水层，调用小库；小库通过标准 HTTP API 与 Service 通信。
Service 对齐行业标准接口，小库天然兼容任何 OpenAI 兼容服务。

---

## 1. 小库现有接口

### agentic-core
```js
const { agenticAsk, toolRegistry } = AgenticCore()

// 核心方法
agenticAsk(prompt, config, emit)
// config: { provider, baseUrl, apiKey, model, tools, history, stream, schema, images, audio, system }
// 直接调 LLM API（支持 anthropic / openai / ollama / gemini）
```

### agentic-voice
```js
const { createVoice, createTTS, createSTT } = AgenticVoice()

// TTS
const tts = createTTS({ provider, baseUrl, apiKey, voice, model })
tts.speak(text, opts)        // 合成+播放
tts.fetchAudio(text, opts)   // 只合成，返回 ArrayBuffer
tts.timestamps(text, opts)   // 词级时间戳
tts.stop()
// provider: 'openai' | 'elevenlabs'
// 调 OpenAI /v1/audio/speech 或 ElevenLabs API

// STT
const stt = createSTT({ provider, baseUrl, apiKey, model })
stt.transcribe(audioBlob, opts)              // 转文字
stt.transcribeWithTimestamps(audioBlob, opts) // 带时间戳
stt.startListening(onResult, onError)         // 实时监听
stt.stopListening()
// provider: 'openai' | 'elevenlabs'
// 调 OpenAI /v1/audio/transcriptions 或 ElevenLabs API

// 组合
const voice = createVoice({ tts: {...}, stt: {...} })
voice.speak(text)
voice.transcribe(audio)
voice.startListening()
```

### agentic-sense
```js
const sense = new AgenticSense()
// 纯端侧 MediaPipe，不调 HTTP API
// 手势/人脸/姿态/物体检测
// 不涉及 Service 通信
```

### agentic-embed (嵌入组件)
```js
// 嵌入式 chat widget，内部用 AgenticClient
// 不直接调 API
```

---

## 2. 行业标准接口 (OpenAI Compatible)

| 能力 | 路径 | 方法 | 格式 |
|------|------|------|------|
| Chat/LLM | `/v1/chat/completions` | POST | messages[], model, stream, tools |
| Vision | `/v1/chat/completions` | POST | messages 里带 image_url content |
| STT | `/v1/audio/transcriptions` | POST | multipart: file, model, language |
| TTS | `/v1/audio/speech` | POST | { input, model, voice } → binary audio |
| Embeddings | `/v1/embeddings` | POST | { input, model } |
| Models | `/v1/models` | GET | 列出可用模型 |

**Anthropic 扩展:**
| 能力 | 路径 | 方法 |
|------|------|------|
| Messages | `/v1/messages` | POST |

---

## 3. Service 现有接口

### 已对齐行业标准 ✅
| 路径 | 对应标准 | 状态 |
|------|----------|------|
| `/v1/chat/completions` | OpenAI Chat | ✅ 已有 |
| `/v1/embeddings` | OpenAI Embeddings | ✅ 已有 |
| `/v1/audio/transcriptions` | OpenAI STT | ✅ 已有 |
| `/v1/audio/speech` | OpenAI TTS | ✅ 已有 |
| `/v1/models` | OpenAI Models | ✅ 已有 |
| `/v1/messages` | Anthropic Messages | ✅ 已有 |

### 自定义接口（Client 在用）
| 路径 | 功能 | 对应标准 |
|------|------|----------|
| `/api/chat` | 聊天（SSE） | → 应迁移到 `/v1/chat/completions` |
| `/api/vision` | 图片理解（SSE） | → 应迁移到 `/v1/chat/completions`（带 image_url） |
| `/api/transcribe` | 语音转文字 | → 应迁移到 `/v1/audio/transcriptions` |
| `/api/synthesize` | 文字转语音 | → 应迁移到 `/v1/audio/speech` |
| `/api/tts` | TTS（同上） | → 应迁移到 `/v1/audio/speech` |
| `/api/voice` | 语音对话（listen+think+speak） | ⚠️ 无行业标准（见第4节） |

### 管理接口（保留）
| 路径 | 功能 |
|------|------|
| `/api/status` | 系统状态 |
| `/api/config` | 配置 |
| `/api/model-pool` | 模型池管理 |
| `/api/engines/*` | 引擎管理 |
| `/api/models/pull` | 拉取模型 |
| `/api/logs` | 日志 |
| `/api/perf` | 性能指标 |
| `/api/queue/stats` | 队列统计 |
| `/api/devices` | 设备列表 |
| `/health` | 健康检查 |

---

## 4. 我们有需求，行业没标准的

### 4a. Voice Conversation（语音对话）
**现有**: `/api/voice` — 一次请求完成 STT → LLM → TTS
**行业**: 无标准。OpenAI Realtime API 用 WebSocket，但那是另一个协议。
**建议**: 保留为 `/api/voice`，这是我们的增值接口。Client 也可以自己组合 STT+Chat+TTS。

### 4b. Vision + Chat 混合上下文
**现有**: `/api/vision` 单独处理图片
**行业**: OpenAI 已统一到 `/v1/chat/completions`，messages 里混合 text + image_url
**建议**: 废弃 `/api/vision`，统一到 `/v1/chat/completions`

### 4c. 多模态连续对话（带图片历史）
**现有**: ExamplesView 里手动拼 messages + images
**行业**: `/v1/chat/completions` 的 messages 天然支持
**建议**: 不需要额外接口，标准 chat completions 就够

### 4d. 自动场景描述（Auto-watch）
**现有**: 前端实现（帧差检测 + 自动发 vision 请求）
**行业**: 无标准
**建议**: 纯前端逻辑，不需要额外 API

---

## 5. 统一接口设计

### 目标架构
```
AgenticClient (胶水)
  ├── agentic-core  → /v1/chat/completions (含 vision)
  ├── agentic-voice
  │   ├── TTS      → /v1/audio/speech
  │   └── STT      → /v1/audio/transcriptions
  └── admin        → /api/* (管理接口，不变)
```

### 迁移计划

**Phase 1: Service 标准化**
- `/api/chat` → alias 到 `/v1/chat/completions`（已有）
- `/api/vision` → 废弃，统一到 `/v1/chat/completions`
- `/api/transcribe` → alias 到 `/v1/audio/transcriptions`（已有）
- `/api/synthesize` + `/api/tts` → alias 到 `/v1/audio/speech`（已有）
- `/api/voice` → 保留（组合接口，无行业标准）

**Phase 2: Client 重写为胶水**
```js
class AgenticClient {
  constructor(baseUrl) {
    this.core = AgenticCore()  // agenticAsk
    this.voice = AgenticVoice.createVoice({
      tts: { provider: 'openai', baseUrl },
      stt: { provider: 'openai', baseUrl }
    })
    this.admin = new Admin(baseUrl)
    this._baseUrl = baseUrl
  }

  // Chat (含 vision)
  think(input, opts) {
    return this.core.agenticAsk(input, {
      provider: 'openai',
      baseUrl: this._baseUrl,
      ...opts
    })
  }

  // Vision = think with images
  see(image, prompt, opts) {
    return this.think(prompt, { ...opts, images: [{ url: image }] })
  }

  // TTS
  speak(text, opts) {
    return this.voice.fetchAudio(text, opts)
  }

  // STT
  listen(audio, opts) {
    return this.voice.transcribe(audio, opts)
  }

  // 组合：语音对话
  async converse(audio, opts) {
    const text = await this.listen(audio)
    const { answer } = await this.think(text, opts)
    const audioOut = await this.speak(answer)
    return { text: answer, audio: audioOut, transcript: text }
  }
}
```

**Phase 3: 清理**
- 删除 client 里的 transport.js, think.js, see.js, speak.js, listen.js
- 删除 service 里的 `/api/chat`, `/api/vision`, `/api/transcribe`, `/api/synthesize`
- 只保留 `/v1/*` 标准接口 + `/api/voice` + `/api/*` 管理接口

---

## 6. 收益

1. **Client 从 578 行 → ~100 行**（纯胶水）
2. **小库的 bug fix 自动惠及 Client**（不再双重维护）
3. **Service 兼容任何 OpenAI 客户端**（curl、Python openai 库、其他工具）
4. **小库兼容任何 OpenAI 兼容服务**（不只是我们的 Service）
5. **新能力只需加到小库**，Client 自动获得
