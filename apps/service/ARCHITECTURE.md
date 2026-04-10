# agentic-service — Architecture

## 依赖关系

```
agentic-service
├── agentic-core      # LLM 调用引擎（streaming, tool use, retry）
├── agentic-sense     # MediaPipe 感知（人脸/手势/物体，浏览器端）
├── agentic-voice     # TTS + STT 统一接口
├── agentic-store     # KV 存储抽象（SQLite/IndexedDB/memory）
└── agentic-embed     # 向量嵌入（bge-m3）
```

## 系统架构

```mermaid
graph TD
    CLI[bin/agentic-service.js] --> Setup[cli/setup.js]
    CLI --> EngInit[engine/init.js]
    CLI --> API[server/api.js]

    Setup --> HW[detector/hardware.js]
    Setup --> Prof[detector/profiles.js]
    Setup --> OllamaDet[detector/ollama.js]
    Prof --> Matcher[detector/matcher.js]

    EngInit --> Registry[engine/registry.js]
    EngInit --> OllamaEng[engine/ollama.js]
    EngInit --> WhisperEng[engine/whisper.js]
    EngInit --> TTSEng[engine/tts.js]
    EngInit --> CloudEng[engine/cloud.js]
    EngInit --> Config[config.js]

    API --> Brain[server/brain.js]
    API --> Hub[server/hub.js]
    API --> STT[runtime/stt.js]
    API --> TTS[runtime/tts.js]
    API --> VAD[runtime/vad.js]
    API --> Profiler[runtime/profiler.js]

    Brain --> Hub
    Hub --> Brain
    Hub --> STT
    Hub --> TTS
    Hub --> VAD

    Brain --> Config
    OllamaEng --> Config

    Sense[runtime/sense.js] --> SenseAdapter[adapters/sense.js]
    STT --> VoiceAdapters[adapters/voice/*]
    TTS --> VoiceAdapters

    Embed[runtime/embed.js] -.-> ae[agentic-embed]
    SenseAdapter -.-> as[agentic-sense]
    Store[store/index.js] -.-> ast[agentic-store]
    VoiceAdapters -.-> av[agentic-voice]

    API --> MW[server/middleware.js]
    API --> HTTPS[server/httpsServer.js]
    HTTPS --> Cert[server/cert.js]
    API --> Tunnel[tunnel.js]
```

## 目录结构

```
bin/
  agentic-service.js           # CLI 入口 — 启动服务器 + 首次安装向导

src/
  index.js                     # 包入口 — 导出 startServer, detect, getProfile, chat, stt, tts, embed
  config.js                    # 统一配置中心 — 读写/监听/模型池

  cli/
    setup.js                   # 首次安装向导 — 硬件检测 → profile 匹配 → Ollama 安装
    browser.js                 # 启动后打开浏览器
    download-state.js          # 下载进度追踪

  detector/
    hardware.js                # GPU/CPU/OS/内存检测
    profiles.js                # 远程 CDN profiles + 本地缓存（4 层 fallback）
    matcher.js                 # 硬件-配置匹配评分
    ollama.js                  # Ollama 自动安装 + 模型拉取
    sox.js                     # SoX 音频工具检测

  engine/
    registry.js                # 引擎注册中心 — register/discoverModels/resolveModel
    init.js                    # 引擎启动 — initEngines() 注册所有引擎
    ollama.js                  # Ollama 引擎 — chat/vision/embedding 模型发现
    cloud.js                   # 云端引擎工厂 — createCloudEngine(provider, config)
    tts.js                     # TTS 引擎 — kokoro/piper/macos-say 模型发现
    whisper.js                 # Whisper 引擎 — whisper.cpp/SenseVoice STT 模型发现

  runtime/
    stt.js                     # 语音识别（多提供商自适应）
    tts.js                     # 语音合成（多提供商自适应）
    sense.js                   # 视觉感知（agentic-sense 封装）
    embed.js                   # 向量嵌入（agentic-embed 封装）
    profiler.js                # CPU 性能分析 — startMark/endMark/getMetrics
    latency-log.js             # 延迟记录 — record(label, ms)/getLog()
    vad.js                     # 语音活动检测（RMS 能量阈值）
    adapters/
      embed.js                 # 嵌入适配器（stub）
      sense.js                 # agentic-sense 适配器 — createPipeline()
      voice/
        elevenlabs.js          # ElevenLabs TTS
        macos-say.js           # macOS say 命令
        openai-tts.js          # OpenAI TTS
        openai-whisper.js      # OpenAI Whisper STT
        piper.js               # Piper TTS（自动下载二进制）
        sensevoice.js          # SenseVoice STT（HTTP API 适配器）
        whisper.js             # Whisper.cpp STT（本地二进制适配器）

  server/
    api.js                     # Express 路由 — REST + OpenAI 兼容 + 管理 + 语音
    brain.js                   # LLM 推理 + 工具注册/调用
    hub.js                     # WebSocket 设备管理 + 会话共享
    middleware.js              # 错误处理中间件
    cert.js                    # 自签名证书生成
    httpsServer.js             # HTTPS 服务器工厂

  store/
    index.js                   # KV 存储封装（agentic-store）

  tunnel.js                    # LAN 隧道（ngrok/cloudflared）

  ui/
    admin/                     # 管理面板（Vue 3 + Vite）
      src/components/          # ConfigPanel, DeviceList, HardwarePanel, LogViewer, SystemStatus
      src/views/               # Status, Config, Logs, LocalModels, CloudModels, Test, Examples
    client/                    # 聊天界面（Vue 3 + Vite）
      src/components/          # ChatBox, InputBox, MessageList, PushToTalk, WakeWord
      src/composables/         # useVAD.js, useWakeWord.js

profiles/
  default.json                 # 内置硬件配置（apple-silicon, nvidia, cpu-only, none, default）

install/
  setup.sh                     # Unix 一键安装脚本
  Dockerfile                   # Docker 镜像构建
  docker-compose.yml           # Docker Compose 配置
  docker-build.sh              # Docker 构建辅助脚本

docker-compose.yml             # 根目录 Docker Compose（端口 1234, OLLAMA_HOST, ./data 卷）
Dockerfile                     # 根目录 Docker 镜像构建
README.md                      # 用户文档（安装/API/架构/故障排除）
```

## 核心模块

### 1. Detector（硬件检测）

```javascript
// detector/hardware.js
detect() → {
  platform: 'darwin' | 'linux' | 'win32',
  arch: 'arm64' | 'x64',
  gpu: { type: 'apple-silicon' | 'nvidia' | 'amd' | 'none', vram: number },
  memory: number,  // GB
  cpu: { cores: number, model: string }
}

// detector/profiles.js
// 4 层 fallback: 新鲜缓存 → 远程获取 → 过期缓存 → 内置 default.json
getProfile(hardware) → {
  llm: { provider: 'ollama', model: 'gemma4:26b', quantization: 'q8' },
  stt: { provider: 'sensevoice', model: 'small' },
  tts: { provider: 'kokoro', voice: 'default' },
  fallback: { provider: 'openai', model: 'gpt-4o-mini' }
}

// detector/matcher.js
matchProfile(profiles, hardware) → ProfileConfig
// 权重: platform=30, gpu=30, arch=20, minMemory=20
// platform 或 gpu 不匹配 → 得分 0
// 空 match → 得分 1（兜底默认 profile）

// detector/ollama.js
ensureOllama(model, onProgress?) → Promise<void>
// 检测 → 自动安装（curl/winget）→ ollama pull <model>
```

### 2. Engine（多引擎注册中心）

```javascript
// engine/registry.js
register(id, engine) → void       // 注册引擎 (ollama, whisper, tts, cloud:openai, ...)
unregister(id) → void
getEngines() → Array<{ id, name, capabilities, ... }>
getEngine(id) → engine | null
discoverModels() → Array<{ id, name, engineId, capabilities, installed }>
resolveModel(modelId) → { engineId, engine, model, provider, modelName } | null
modelsForCapability(cap) → Array<Model>  // 按能力筛选 (chat, stt, tts, embedding)

// engine/init.js
initEngines() → Promise<void>
// 1. 注册本地引擎: ollama, whisper, tts
// 2. 从 config.providers 注册云端引擎: cloud:openai, cloud:anthropic, ...
// 3. 兼容旧 modelPool 格式

// engine/ollama.js — Ollama 引擎
// status() → { available, version }
// models() → 从 Ollama API 获取已安装模型列表
// run(model, input) → 调用 Ollama chat/embedding API

// engine/cloud.js
createCloudEngine(provider, config) → engine
// 支持 openai, anthropic, google
// 每个 provider 有默认模型列表 + 自定义模型

// engine/whisper.js — STT 引擎
// 检测 whisper-cpp 二进制 + SenseVoice HTTP 服务

// engine/tts.js — TTS 引擎
// 发现 kokoro, piper, macos-say 可用性
```

### 3. Runtime（服务运行时）

```javascript
// runtime/stt.js
init(config) → void           // 根据 config.stt.provider 选择适配器
transcribe(audioBuffer) → text

// runtime/tts.js
init(config) → void           // 根据 config.tts.provider 选择适配器
synthesize(text) → audioBuffer

// runtime/sense.js
init(videoElement) → Promise<void>       // 初始化 MediaPipe pipeline
on(type, handler) → void                // 注册事件: face_detected, gesture_detected, object_detected, wake_word
detect(frame) → { faces, gestures, objects }
start() / stop()                         // 事件循环模式（浏览器端）
initHeadless(options?) → Promise<void>   // 服务端无头初始化
startHeadless() → EventEmitter           // 服务端无头模式 + 唤醒词
detectFrame(buffer) → { faces, gestures, objects }  // 单帧检测（服务端）
startWakeWordPipeline(onWakeWord) → Promise<void>   // node-record-lpcm16 + VAD 唤醒词管道
stopWakeWordPipeline() → void

// runtime/embed.js
embed(text) → number[]        // 委托 agentic-embed

// runtime/profiler.js
startMark(label) → void
endMark(label) → void
getMetrics() → Map<label, { count, total, avg, min, max }>
measurePipeline(stages) → Promise<{ results, total }>  // 端到端管道计时

// runtime/latency-log.js
record(stage, ms) → void
p95(stage) → number           // 第 95 百分位延迟
reset() → void                // 清空采样数据

// runtime/vad.js
detectVoiceActivity(buffer) → boolean  // RMS 能量阈值检测（Int16 PCM）
```

### 4. Server（HTTP/WebSocket）

```javascript
// server/api.js
createApp() → { app, server }
// REST 端点:
//   GET  /health
//   GET  /v1/models              (OpenAI 兼容)
//   POST /v1/chat/completions    (OpenAI 兼容)
//   POST /v1/messages            (Anthropic 兼容)
//   POST /api/chat               (流式聊天)
//   POST /api/transcribe         (STT)
//   POST /api/synthesize         (TTS)
//   POST /api/voice              (STT → LLM → TTS 全链路)
//   GET  /api/status             (设备 + Ollama 状态)
//   GET  /api/config             (读取配置)
//   PUT  /api/config             (更新配置)
//   GET  /api/logs               (日志缓冲)
//   GET  /api/perf               (性能指标)
//   GET  /api/models/pool        (模型池)
//   POST /api/models/pool        (添加模型)
//   DELETE /api/models/pool/:id  (删除模型)
//   GET  /api/models/assignments (能力分配)
//   PUT  /api/models/assignments (更新分配)
// 静态文件: /admin → dist/admin
// SIGINT 优雅关闭: startDrain() + waitDrain(timeout)

// server/brain.js
chat(input, options?) → AsyncGenerator<{ type, content, done }>
// LLM 推理核心 — Ollama 优先 → 云端 fallback (OpenAI/Anthropic)
// 内部: ollamaChat(), cloudChat(), chatWithTools()
// 解析模型池分配 → 选择 provider → 流式推理
// 支持 tool_use: registerTool(name, fn), 自动执行工具调用
// 云端 fallback: 首 token 超时 5s / 连续 3 次错误 → 切云端; 60s 探测恢复
// 集成 profiler startMark/endMark
registerTool(name, fn) → void
chatSession(sessionId, userMessage, options?) → AsyncGenerator

// server/hub.js
init() → Promise<void>
initWebSocket(server) → void
joinSession(sessionId, deviceId) → { sessionId, history, brainState, deviceCount }
broadcastSession(sessionId, message?) → void
setSessionData(sessionId, key, value) → void
getSessionData(sessionId, key) → any
getSession(sessionId) → Session | null
getDevices() → Array<{ id, name, capabilities, lastPong }>
sendCommand(deviceId, command) → Promise<response>
startWakeWordDetection() → void
broadcastWakeword() → void
// WebSocket 消息: register/registered/ping/pong/chat/voice/wakeword
// 心跳超时: 60s (60000ms)
// 设备注册: { type: "register", deviceId, capabilities }

// server/middleware.js
errorHandler(err, req, res, next) → void  // Express 错误处理

// server/cert.js
generateCert() → { key, cert }  // selfsigned 自签名证书

// server/httpsServer.js
createHttpsServer(app, options?) → https.Server
```

### 5. Store（数据持久化）

```javascript
// store/index.js — 封装 agentic-store
get(key) → Promise<any>
set(key, value) → Promise<void>
del(key) → Promise<void>
delete(key) → Promise<void>   // del() 的别名
```

### 6. Tunnel（LAN 隧道）

```javascript
// tunnel.js
startTunnel(port) → void
// 优先 ngrok，其次 cloudflared
// 未安装则退出
// SIGINT 时自动终止子进程
```

### 7. CLI（命令行工具）

```javascript
// cli/setup.js
runSetup() → Promise<void>
// 首次安装向导: 硬件检测 → profile 匹配 → Ollama 安装 → 模型拉取

// cli/browser.js
openBrowser(port) → void
// 启动后自动打开浏览器

// cli/download-state.js
getDownloadState() → object   // 读取 ~/.agentic-service/download-state.json
setDownloadState(updates) → void
clearDownloadState() → void

// detector/sox.js
ensureSox() → Promise<void>   // 检测/安装 sox 音频工具（brew/apt/choco）
```

### 8. Config（配置中心）

```javascript
// config.js
getConfig() → Promise<Config>
setConfig(updates) → Promise<void>
onConfigChange(fn) → void
reloadConfig() → Promise<Config>
getModelPool() → Promise<Array<ModelEntry>>
addToPool(entry) → Promise<void>
removeFromPool(id) → Promise<void>
getAssignments() → Promise<Record<slot, modelId>>
setAssignments(assignments) → Promise<void>
// 配置路径: ~/.agentic-service/config.json
// 能力槽: chat, code, vision, embedding, stt, tts
```

### 9. VAD + 唤醒词

```javascript
// runtime/vad.js
detectVoiceActivity(buffer) → boolean
// RMS 能量阈值检测，Int16 PCM 输入

// hub.js 内置
isSilent(buffer) → boolean    // Float32 RMS < 0.01
startWakeWordDetection()      // 服务端唤醒词管道

// ui/client/composables/useVAD.js — 客户端 VAD
// ui/client/composables/useWakeWord.js — 客户端唤醒词
// ui/client/components/PushToTalk.vue — 按住说话
// ui/client/components/WakeWord.vue — 唤醒词 UI
```

### 10. agentic-embed（向量嵌入）

```javascript
// runtime/embed.js — 封装 agentic-embed 包
embed(text) → number[]  // bge-m3 向量嵌入
// TypeError if text is not a string
// 空字符串返回空数组
```

### 11. Runtime Adapters（运行时适配器）

```javascript
// runtime/adapters/sense.js — agentic-sense 适配层
createPipeline(options?) → AgenticSense  // 创建 MediaPipe 感知管道

// runtime/adapters/embed.js — ⚠️ 死代码 stub（实际嵌入走 runtime/embed.js → agentic-embed，此文件可删除）

// runtime/adapters/voice/ — 语音适配器
//   sensevoice.js  — SenseVoice STT (HTTP API, Apple Silicon 本地)
//   whisper.js     — Whisper.cpp STT (本地二进制)
//   openai-whisper.js — OpenAI Whisper API (云端 fallback)
//   piper.js       — Piper TTS (自动下载二进制 + 模型)
//   openai-tts.js  — OpenAI TTS API (云端 fallback)
//   elevenlabs.js  — ElevenLabs TTS (云端)
//   macos-say.js   — macOS say 命令 (本地零依赖)
```

## 数据流

### 文本聊天

```
Client → POST /api/chat → api.js → brain.chat()
  → resolveModel(slot='chat') → config.assignments → model pool
  → engine/registry.resolveModel(modelId) → 找到对应引擎
  → ollamaChat(messages) → Ollama streaming → yield chunks
  → (Ollama 失败/超时) → cloudChat() fallback (OpenAI/Anthropic)
  → SSE stream → Client
```

### 语音对话

```
Client → POST /api/voice (audio file)
  → stt.transcribe(buffer) → text
  → brain.chat([{role:'user', content:text}]) → LLM response
  → tts.synthesize(response) → audio buffer
  → Response (audio + text + latency)
  延迟预算: <2000ms (profiler.js 强制)
```

### 设备注册

```
Device → WebSocket connect → hub.js
  → { type: "register", deviceId, capabilities }
  → registry.set(deviceId, { ws, name, capabilities, lastPong })
  → { type: "registered", sessionId }
  → 心跳: ping/pong 每 60s
  → 超时: 60s 无 pong → 移除设备
```

### 硬件检测 + 配置

```
npx agentic-service → setup.js
  → hardware.detect() → { platform, arch, gpu, memory, cpu }
  → profiles.getProfile(hardware)
    → 缓存 → CDN → 过期缓存 → default.json
    → matcher.matchProfile(profiles, hardware)
  → ollama.ensureOllama(profile.llm.model)
  → config.setConfig(profile)
  → engine/init.initEngines() → 注册 ollama/whisper/tts/cloud 引擎
  → 启动服务器
```

## 安装方式

```bash
# npx 一键启动
npx agentic-service

# 全局安装
npm install -g agentic-service
agentic-service

# Docker
docker-compose up
# 注意: 默认端口 1234，Docker Compose 需配置正确端口映射
```

## 设计原则

1. **本地优先** — 默认全本地运行，云端仅作 fallback
2. **硬件自适应** — 启动时检测硬件，自动选择最优模型配置
3. **零配置** — 开箱即用，首次运行自动完成所有设置
4. **模块化** — 每个能力独立模块，统一接口，可替换适配器
5. **流式优先** — LLM/STT/TTS 全部支持流式处理，降低感知延迟

## 已知限制

1. **middleware.js 仅含错误处理** — 无请求验证、速率限制或安全中间件。本地优先架构下可接受，生产部署需增强。
2. **adapters/embed.js 是死代码** — 抛出 'not implemented'，实际嵌入通过 runtime/embed.js → agentic-embed 包。
3. **mDNS/Bonjour 未实现** — 设备发现依赖 tunnel.js (ngrok/cloudflared) 而非 .local 广播。
4. **根 Dockerfile EXPOSE 3000** — 应为 1234（install/Dockerfile 已正确，根 Dockerfile 待修复）。
