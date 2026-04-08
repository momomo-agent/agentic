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
// 远程拉取 + 本地缓存
getProfile(hardware) → {
  llm: { provider: 'ollama', model: 'gemma4:26b', quantization: 'q8' },
  stt: { provider: 'sensevoice', model: 'small' },
  tts: { provider: 'kokoro', voice: 'default' },
  fallback: { provider: 'openai', model: 'gpt-4o-mini' }
}

// detector/matcher.js
matchProfile(profiles, hardware) → ProfileConfig
// 按权重匹配硬件配置：platform=30, gpu=30, arch=20, minMemory=20
// platform 或 gpu 不匹配 → 得分 0（排除该 profile）
// 空 match 条件 → 得分 1（兜底默认 profile）
// 返回得分最高的 profile

// detector/ollama.js
ensureOllama(model, onProgress?) → Promise<void>
// 检测 Ollama 是否安装（which ollama），未安装则自动安装：
//   Unix: curl 安装脚本
//   Windows: winget install
// 然后执行 ollama pull <model>，通过 onProgress 回调报告进度
```

### 2. Runtime（服务运行时）

每个能力是一个独立模块，统一接口：

```javascript
// runtime/llm.js — 封装 agentic-core
chat(messages, options) → stream
// 自动选择：本地 Ollama 优先，超时/失败 → 云端 fallback

// runtime/stt.js — 封装 agentic-voice
transcribe(audioBuffer) → text

// runtime/tts.js — 封装 agentic-voice
synthesize(text) → audioBuffer

// runtime/memory.js — KV 向量记忆（基于 agentic-embed）
add(text) → Promise<void>          // 嵌入文本，存储向量，生成 key "mem:<ts>:<random>"
remove(key) → Promise<void>        // 别名 delete()
search(query, topK?=5) → Promise<Array<{ text: string, score: number }>>
// 使用 promise 锁（_lock）保证写操作串行
```

### 3. Server（HTTP/WebSocket）

从 Ambient Hub 提取，简化：

```javascript
// server/hub.js — 设备管理
// server/brain.js — LLM 推理 + 工具调用
// server/api.js — REST API

// API 端点
POST /api/chat       { message, history } → stream
POST /api/transcribe { audio } → { text }
POST /api/synthesize { text } → audio
GET  /api/status     → { hardware, profile, devices }
GET  /api/config     → current config
PUT  /api/config     → update config
```

### 4. UI（Web 前端）

轻量 Vue 3 + Vite，两个页面：
- `/` — 用户对话界面（文本 + 语音）
- `/admin` — 管理面板（硬件信息、配置、设备、日志）

## 安装流程

```bash
# 方式 1: npx（推荐）
npx agentic-service

# 方式 2: 全局安装
npm i -g agentic-service
agentic-service

# 方式 3: Docker
docker run -p 3000:3000 momomo/agentic-service
```

首次启动流程：
1. 检测硬件
2. 拉取 profiles.json
3. 匹配最优配置
4. 检查/安装 Ollama
5. 拉取推荐模型（显示进度）
6. 启动服务
7. 打开浏览器 → http://localhost:3000

## 目录结构

```
agentic-service/
├── package.json
├── bin/
│   └── agentic-service.js    # CLI 入口
├── src/
│   ├── detector/
│   │   ├── hardware.js
│   │   ├── profiles.js
│   │   ├── matcher.js
│   │   ├── ollama.js
│   │   └── optimizer.js
│   ├── runtime/
│   │   ├── llm.js
│   │   ├── stt.js
│   │   ├── tts.js
│   │   ├── sense.js
│   │   └── memory.js
│   ├── server/
│   │   ├── hub.js
│   │   ├── brain.js
│   │   └── api.js
│   └── ui/
│       ├── client/
│       └── admin/
├── profiles/
│   └── default.json          # 内置默认配置
├── install/
│   ├── setup.sh
│   ├── Dockerfile
│   └── docker-compose.yml
└── test/
```

## 5. Tunnel (LAN/WAN Exposure)

```javascript
// src/tunnel.js
// Spawns ngrok or cloudflared to expose local port externally
// Prefers ngrok if installed, falls back to cloudflared
// Handles SIGINT to kill subprocess cleanly
startTunnel(port: number) → void
```

## 6. CLI Modules

```javascript
// src/cli/setup.js — first-run wizard: detect hardware, pull profile, install Ollama, pull model
// src/cli/browser.js — open browser to http://localhost:<port> after server starts
```

## 7. VAD (Voice Activity Detection)

```javascript
// src/runtime/vad.js
detectVoiceActivity(buffer: Buffer) → boolean
// RMS energy threshold (0.01). Returns true if audio contains speech.
```

## 8. HTTPS & Middleware

```javascript
// src/server/cert.js — generates self-signed cert via selfsigned
// src/server/httpsServer.js — createServer(app) → https.Server
// src/server/middleware.js — errorHandler(err, req, res, next) → void
```


Add sections to ARCHITECTURE.md documenting: (1) LAN Tunnel module (tunnel.js), (2) CLI module (src/cli/setup.js, browser.js), (3) HTTPS/Middleware layer (cert.js, httpsServer.js, middleware.js), (4) VAD runtime module (vad.js), (5) agentic-embed runtime integration (embed.js, adapters/), (6) Detector submodules (matcher.js, ollama.js).

Add the following clarifications to ARCHITECTURE.md: (1) llm.js loadConfig() MUST call optimizer.js and use its output model selection, not hardcode gemma4:26b; (2) sense.js MUST export detect(frame) in addition to event API for server-side use; (3) store.js MUST export delete() alias alongside del(); (4) brain.js tool_use response MUST include text field; (5) hub.js heartbeat timeout MUST be 60s per DBB-005; (6) hub.js MUST broadcast wakeword events to connected clients; (7) profiles.js remote URL MUST use cdn.example.com (not jsdelivr proxy); (8) server entry MUST register process.on('SIGINT') for graceful shutdown.

Either: (a) document src/store/, src/cli/, src/runtime/embed.js as acceptable local implementations when dependencies are unavailable, or (b) clarify migration path to use agentic-store/agentic-embed packages

Add the following sections to ARCHITECTURE.md: (1) sense.js dual-path: browser MediaPipe + server-side headless (canvas/node-canvas) for Node.js compatibility; (2) always-on wake word pipeline: server-side VAD + wake word detection feeding STT, not just UI composable; (3) latency budget: STT≤500ms + LLM first-token≤1000ms + TTS≤500ms = <2s total, enforced via perf logging; (4) network security: HTTPS via self-signed cert + optional ngrok/cloudflared tunnel for LAN multi-device; (5) profiles CDN: 7-day TTL cache with ETag/Last-Modified staleness check; (6) VAD: WebRTC VAD or silero-vad for auto speech segmentation; (7) profiles/default.json: add cpu-only profile with smaller models; (8) SIGINT: drain in-flight requests with 5s timeout before exit; (9) brain state sync: hub.js broadcastSession to share memory/context across devices.

Re-run architecture gap analysis against current codebase to update match score and gap statuses. Expected match should be ~75-85% after m18-m22 implementations.

Re-run architecture gap analysis against actual source files to produce an accurate match score. Update architecture.json to reflect implemented status for modules confirmed present by PRD/DBB analysis.

Re-run the architecture gap scan against the current codebase to produce an accurate match score and gap list. The scan should verify file existence before marking gaps as 'missing'.

Update ARCHITECTURE.md to either (a) formally include these modules with their roles and interfaces, or (b) explicitly mark them as out-of-scope so they can be removed. This will resolve the 22% architecture gap and unblock accurate compliance tracking.

Add to ARCHITECTURE.md under Server section: src/server/cert.js (generateCert), src/server/httpsServer.js (createServer), src/server/middleware.js (errorHandler). Add new CLI section: src/cli/setup.js (runSetup), src/cli/browser.js (openBrowser).

Add the following to ARCHITECTURE.md under the relevant sections: (1) detector/matcher.js and detector/ollama.js under the Detector module; (2) server/cert.js, server/httpsServer.js, server/middleware.js under the Server module; (3) src/cli/ directory under the directory structure. Alternatively, if these files are intentional extras not part of the core architecture, document them as 'implementation details' outside the spec boundary.

Either: (A) Update ARCHITECTURE.md dependency diagram to show these as local modules instead of external packages, OR (B) Create milestone to extract these modules into separate publishable packages with proper versioning and dependency management.

Add sections for: Tunnel module (src/tunnel.js), CLI module (src/cli/), HTTPS/Middleware layer, VAD runtime (src/runtime/vad.js), and agentic-embed runtime integration (src/runtime/embed.js + adapters/).

Add sections for: tunnel.js (LAN tunnel via ngrok/cloudflared), src/cli/setup.js + browser.js, runtime/vad.js (RMS energy VAD), HTTPS/middleware layer (cert.js, httpsServer.js, middleware.js).

Add sections for: tunnel (src/tunnel.js - LAN tunnel), CLI (src/cli/ - setup.js, browser.js), HTTPS/middleware (src/server/cert.js, httpsServer.js, middleware.js), VAD (src/runtime/vad.js), embed runtime (src/runtime/embed.js and adapters/).

Add sections:

## 5. Tunnel (src/tunnel.js)
startTunnel(port: number) → void — spawns ngrok or cloudflared; prefers ngrok; exits if neither installed; kills subprocess on SIGINT

## 6. CLI (src/cli/)
runSetup() → Promise<void> — first-run wizard
openBrowser(port: number) → void — opens browser after server starts

## 7. HTTPS/Middleware (src/server/cert.js, httpsServer.js, middleware.js)
generateCert() → { key, cert }
createHttpsServer(app, options) → https.Server
applyMiddleware(app) → void

## 8. VAD (src/runtime/vad.js)
detectVoiceActivity(buffer: Buffer) → boolean — RMS energy threshold on Int16 PCM

## 9. Embed (src/runtime/embed.js)
embed(text: string) → Promise<number[]> — delegates to agentic-embed

Add module sections to ARCHITECTURE.md for: (1) tunnel.js — LAN tunnel capability, (2) src/cli/ — CLI module with setup.js and browser.js, (3) HTTPS/middleware layer — cert.js, httpsServer.js, middleware.js, (4) VAD — src/runtime/vad.js voice activity detection, (5) agentic-embed runtime — src/runtime/embed.js and adapters/

Add sections for: Tunnel module (tunnel.js — LAN tunnel via localtunnel/ngrok), CLI module (cli/setup.js, cli/browser.js — setup wizard and browser launch), HTTPS/Middleware layer (server/cert.js, server/httpsServer.js, server/middleware.js), VAD module (runtime/vad.js — voice activity detection), and agentic-embed integration (runtime/embed.js, runtime/adapters/ — vector embedding via bge-m3).

Add section to ARCHITECTURE.md:

## 9. agentic-embed (Vector Embedding)
```javascript
// src/runtime/embed.js — wraps agentic-embed package
embed(text: string) → number[]  // bge-m3 vector embedding
// Throws TypeError if text is not a string
// Returns empty array for empty string
// Used by memory.js for semantic search / retrieval
```