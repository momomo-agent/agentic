# agentic-service — PRD

## 概述

agentic-service 是一个本地优先的 AI 服务，自动检测硬件、选择最优模型、提供语音+文本+视觉交互，支持多设备连接和云端 fallback。

**核心原则：** 零配置启动，本地优先，云端兜底，多设备协同。

---

## M1: 硬件检测 + 一键启动

**目标：** 检测硬件 → 自动选模型 → 一键启动本地 AI 服务

### Features

1. **硬件检测器** (`src/detector/hardware.js`) — 检测 GPU 类型、显存/内存、CPU 架构、OS，返回结构化 JSON
2. **远程 profiles** (`src/detector/profiles.js`) — GitHub raw URL 拉取硬件配置推荐表，4 层 fallback：新鲜缓存 → 远程获取 → 过期缓存 → 内置 default.json；ETag 条件获取
3. **Profile 匹配** (`src/detector/matcher.js`) — 根据硬件检测结果匹配最优 profile
4. **Ollama 集成** (`src/detector/ollama.js`) — 自动检测/安装 Ollama + 拉取推荐模型，显示下载进度
5. **Sox 检测** (`src/detector/sox.js`) — 自动检测/安装 sox 音频工具（ensureSox）
6. **基础 HTTP 服务** (`src/server/api.js`) — REST API（完整端点列表见「REST API 端点」章节）
7. **Web UI（最小版）** (`src/ui/client/`) — Vue 3 + Vite 客户端，文本聊天对话框，SSE streaming 显示
8. **一键安装** — `npx agentic-service` 通过 `bin/agentic-service.js` + `src/cli/setup.js` 首次启动自动配置

### 验收标准

- [ ] 在 M4 Mac mini 上 `npx agentic-service` 能自动检测硬件并推荐 gemma4
- [ ] 首次安装（含模型下载）< 10 分钟
- [ ] 非首次启动 < 10 秒
- [ ] 文本对话可用

---

## M2: 语音交互

**目标：** 加上语音输入输出，实现语音对话

### Features

1. **STT 集成** — `engine/whisper.js` 注册 whisper 引擎，`runtime/stt.js` 通过适配器选择提供商：sensevoice (apple-silicon) / whisper (nvidia) / cloud (cpu-only)
2. **TTS 集成** — `engine/tts.js` 注册 TTS 引擎，`runtime/tts.js` 通过适配器选择提供商：kokoro/piper (本地) / cloud fallback
3. **VAD (Voice Activity Detection)** — 服务端能量检测 VAD (`runtime/vad.js`) + 客户端 `useVAD.js` composable
4. **Web UI 语音** — 按住说话 / VAD 自动检测（`PushToTalk.vue`、`useVAD.js`）
5. **唤醒词** — 可配置唤醒词（默认 "hey"），`WakeWord.vue` + `useWakeWord.js` + 服务端 `startWakeWordPipeline()` (node-record-lpcm16 + energy-based VAD)

### 语音适配器 (`src/runtime/adapters/voice/`)

| 适配器 | 类型 | 说明 |
|--------|------|------|
| `sensevoice.js` | STT | Apple Silicon 本地 STT |
| `whisper.js` | STT | NVIDIA 本地 whisper |
| `openai-whisper.js` | STT | OpenAI Whisper API 云端 fallback |
| `piper.js` | TTS | 本地 Piper TTS |
| `openai-tts.js` | TTS | OpenAI TTS API 云端 fallback |
| `elevenlabs.js` | TTS | ElevenLabs TTS 云端 |
| `macos-say.js` | TTS | macOS 内置 say 命令 |

### 技术规格

- **语音延迟** — 端到端 <2s (STT + LLM + TTS)，`runtime/profiler.js` 的 `measurePipeline()` 强制 2000ms 预算
- **延迟记录** — `runtime/latency-log.js` 提供 `record()`、`p95()`、`reset()` 用于延迟统计
- **STT/TTS fallback** — 本地失败时自动切云端，匹配 LLM fallback 模式

---

## M3: 多设备 + 感知

**目标：** 多设备连接同一个 AI 大脑，加上视觉感知

### Features

1. **多设备连接** (`src/server/hub.js`) — WebSocket 设备注册/心跳，joinSession/broadcastSession 支持 brainState 同步
2. **视觉感知** (`src/runtime/sense.js`) — 封装 agentic-sense，导出 init/on/start/stop/detect/startWakeWordPipeline/stopWakeWordPipeline/initHeadless/startHeadless/detectFrame
3. **感知适配器** (`src/runtime/adapters/sense.js`) — agentic-sense 适配层
4. **设备工具** — sendCommand() 支持 capture/speak/display，capture 支持超时处理
5. **管理面板** (`src/ui/admin/`) — Vue 3 管理后台（完整视图列表见「管理面板」章节）
6. **KV 存储** (`src/store/index.js`) — 封装 agentic-store，导出 get/set/del/delete；向量嵌入通过 `src/runtime/embed.js` 封装 agentic-embed
7. **HTTPS/LAN 隧道** — `server/httpsServer.js` + `server/cert.js` 支持 HTTPS；`tunnel.js` 支持 ngrok/cloudflared 跨网络访问

### 技术规格

- **WebSocket 消息格式** — `{type, deviceId, payload, ts}`
- **心跳间隔** — 60s (60000ms)
- **注册握手** — 客户端发送 `{type: "register", deviceId, capabilities}`，服务端响应 `{type: "registered", sessionId}`
- **store.js API** (`src/store/index.js`) — 封装 agentic-store，导出 get/set/del + delete() 别名
- **embed.js API** (`src/runtime/embed.js`) — 封装 agentic-embed 的 localEmbed，导出 embed(text) → vector

---

## M4: 云端 fallback + 产品打磨

**目标：** 本地不够时自动切云端，整体打磨

### Features

1. **云端 fallback** — `server/brain.js` 实现完整 fallback 逻辑：本地 LLM 首 token 超时 >5s 或连续 3 次错误 → 自动切换到配置的云端提供商；60s 探测成功后恢复本地
2. **配置热更新** — `watchProfiles()` 每 30s 轮询，ETag 条件获取 (`detector/profiles.js`)
3. **Docker 部署** — 根目录 `docker-compose.yml` 暴露端口 1234，挂载 `./data` 卷，包含 `OLLAMA_HOST` 环境变量；`install/` 目录包含 Dockerfile、docker-compose.yml、setup.sh
4. **文档 + README** — 完整的用户文档：安装方式（npx/全局/Docker）、API 端点、架构、故障排除
5. **profiles CDN** — GitHub raw URL，4 层 fallback：新鲜缓存 → 远程获取 → 过期缓存 → 内置 default.json

### 技术规格

- **默认端口** — 1234 (`bin/agentic-service.js`)
- **package.json main** — `src/index.js` 导出核心 API：startServer, createApp, stopServer, detect, getProfile, matchProfile, ensureOllama, chat, stt, tts, embed
- **云端 fallback 触发器** — `brain.js` 管理 fallback 状态；首 token 超时 >5s (`FIRST_TOKEN_TIMEOUT_MS`) 或连续 3 次错误 (`MAX_ERRORS`) 时切换云端，60s 探测恢复 (`PROBE_INTERVAL_MS`)
- **SIGINT 优雅关闭** — `bin/agentic-service.js` 监听 SIGINT，调用 `server.close()` 后 `process.exit(0)`

---

## 引擎架构

**目标：** 统一模型发现与路由，用户只看到模型，引擎是内部实现

### 模块

1. **引擎注册表** (`src/engine/registry.js`) — `register(id, engine)`、`unregister(id)`、`getEngines()`、`getEngine(id)`、`discoverModels()`、`resolveModel(modelId)`、`modelsForCapability(cap)`
2. **引擎初始化** (`src/engine/init.js`) — `initEngines()` 启动时自动注册 ollama/whisper/tts 本地引擎 + 从配置读取云端引擎
3. **Ollama 引擎** (`src/engine/ollama.js`) — 本地 Ollama 引擎，提供 status/models/run
4. **Whisper 引擎** (`src/engine/whisper.js`) — 本地 Whisper STT 引擎
5. **TTS 引擎** (`src/engine/tts.js`) — 本地 TTS 引擎（kokoro/piper）
6. **Cloud 引擎** (`src/engine/cloud.js`) — `createCloudEngine(providerId, config)` 工厂函数，支持 OpenAI/Anthropic 等

### 引擎接口

每个引擎实现：`{ name, capabilities, status(), models(), run(model, input), install?() }`

### 模型解析

`resolveModel(modelId)` 返回 `{ engineId, engine, model, provider, modelName }`，支持格式：
- 精确匹配 pool 中的模型 ID
- `ollama:model-name` 格式
- `cloud:provider:model-name` 格式

---

## 配置系统

**目标：** 统一配置中心，唯一真相源

### 模块

- **配置中心** (`src/config.js`) — 读写 `~/.agentic-service/config.json`

### 数据模型

```json
{
  "modelPool": [{ "id", "name", "provider", "apiKey?", "baseUrl?", "capabilities" }],
  "assignments": { "chat": "modelId", "vision": null, "stt": null, "tts": null, "embedding": null, "chatFallback": "modelId" },
  "stt": { "provider": "whisper" },
  "tts": { "provider": "kokoro", "voice": "default" },
  "ollamaHost": "http://localhost:11434"
}
```

### API

- `getConfig()` — 读取配置（带缓存）
- `setConfig(updates)` — 写入配置并通知监听者
- `initFromProfile(profile, hardware)` — 用 profile 匹配结果初始化（仅 setup 时）
- `onConfigChange(fn)` — 注册配置变更监听
- `reloadConfig()` — 强制重新读取磁盘
- `getModelPool()` — 获取模型池（合并 Ollama 自动发现 + 配置的云端模型）
- `addToPool(model)` — 添加模型到池（持久化）
- `removeFromPool(id)` — 从池中移除模型
- `getAssignments()` — 获取能力槽位分配
- `setAssignments(updates)` — 更新能力槽位分配
- `CONFIG_PATH` — 配置文件路径常量
- `CAPABILITIES` — `['chat', 'vision', 'stt', 'tts', 'embedding']`

---

## Brain 模块

**目标：** 统一对话入口，管理工具调用和 fallback

### 模块

- **Brain** (`src/server/brain.js`) — 对话核心

### API

- `chat(input, options)` — async generator，yield `{type: 'content', text}` 或 `{type: 'tool_call', ...}` 或 `{type: 'error', error}`
- `chatSession(sessionId, userMessage, options)` — 基于 session 的对话，自动管理历史和 brainState
- `registerTool(name, fn)` — 注册可被 LLM 调用的工具

### Cloud Fallback 状态机

```
LOCAL → (首 token >5s 或连续 3 次错误) → CLOUD
CLOUD → (60s 探测 Ollama /api/tags 成功) → LOCAL
CONFIG_CHANGE → 重置为 LOCAL
```

### 模型解析优先级

1. `config.assignments[slot]` → 从 modelPool 查找
2. `config.llm.model` → 旧格式兼容
3. `config.fallback.provider` → 云端 fallback

---

## CLI + 下载状态

### 模块

- `src/cli/setup.js` — 首次启动向导：硬件检测 → profile 匹配 → Ollama 安装 → 模型下载
- `src/cli/browser.js` — 启动后自动打开浏览器
- `src/cli/download-state.js` — 模型下载进度状态管理
- `bin/agentic-service.js` — CLI 入口，解析参数，启动服务

---

## 性能监控

### 模块

- `src/runtime/profiler.js` — `startMark(label)`、`endMark(label)` → ms、`getMetrics()` 汇总、`measurePipeline()` 强制 2000ms 预算
- `src/runtime/latency-log.js` — `record(ms)`、`p95()`、`reset()` 延迟统计

### 集成点

- `stt.js`、`tts.js`、`brain.js` 内部调用 profiler 记录各阶段耗时
- `/api/voice` 端点记录延迟并在超标时 warn

---

## 服务器中间件

- `src/server/middleware.js` — `errorHandler(err, req, res, next)` 错误处理中间件，记录错误日志并返回 JSON 错误响应（默认 500）

---

## REST API 端点

`src/server/api.js` 提供以下完整 REST API：

### 健康检查 & 状态

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/status` | 返回硬件、配置、Ollama 状态、设备列表、下载状态 |
| GET | `/api/devices` | 返回已连接设备列表 |
| GET | `/api/logs` | 返回最近 50 条日志 |
| GET | `/api/perf` | 返回性能指标（profiler 数据） |

### 对话 & 聊天

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/chat` | 聊天端点，支持 SSE streaming、工具调用、session 追踪；接受 `message` 或 `messages` 格式 |

### 语音 & 视觉

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/transcribe` | 语音转文字（STT） |
| POST | `/api/synthesize` | 文字转语音（TTS） |
| POST | `/api/tts` | `/api/synthesize` 别名 |
| POST | `/api/voice` | 完整语音管线（STT → LLM → TTS） |
| POST | `/api/vision` | 多模态图像分析，支持云端和本地 Ollama |

### 配置管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/config` | 获取当前配置 |
| PUT | `/api/config` | 更新配置 |

### 模型池 & 能力分配

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/model-pool` | 获取模型池（合并 Ollama 自动发现 + 配置的云端模型） |
| POST | `/api/model-pool` | 添加模型到池 |
| DELETE | `/api/model-pool/:id` | 从池中移除模型 |
| GET | `/api/assignments` | 获取能力槽位分配 |
| PUT | `/api/assignments` | 更新能力槽位分配 |

### 模型管理

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/models/pull` | 拉取/下载模型（streaming 进度） |
| DELETE | `/api/models/:name` | 删除模型 |

### 引擎发现

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/engines` | 列出可用引擎及状态 |
| GET | `/api/engines/models` | 跨引擎发现可用模型 |
| GET | `/api/engines/recommended` | 获取推荐模型 |

### Ollama 代理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ollama/tags` | 代理 Ollama tags API |
| POST | `/api/ollama/pull` | 代理 Ollama pull（streaming） |
| DELETE | `/api/ollama/delete` | 代理 Ollama delete |

### OpenAI / Anthropic 兼容 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/models` | OpenAI 兼容模型列表 |
| POST | `/v1/chat/completions` | OpenAI 兼容聊天补全（支持 streaming 和工具调用） |
| POST | `/v1/messages` | Anthropic 兼容消息端点（支持 streaming） |

### 静态资源

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 管理面板首页 |
| GET | `/admin` | 管理面板（no-store 缓存） |
| GET | `/admin/*` | 管理面板静态资源 |
| GET | `/examples/*` | 示例文件 |
| GET | `/packages/*` | 包文件 |

---

## 管理面板

`src/ui/admin/` — Vue 3 管理后台，提供完整的模型管理、配置、监控界面。

### 视图

| 视图 | 文件 | 说明 |
|------|------|------|
| 状态总览 | `StatusView.vue` | 系统状态仪表盘：服务状态、Ollama、STT/TTS 配置 |
| 统一模型管理 | `ModelsView.vue` | 已安装模型列表（含引擎标签和能力），支持删除 |
| 本地模型 | `LocalModelsView.vue` | Ollama 本地模型管理：状态监控、安装指南、推荐模型、自定义拉取 |
| 云端模型 | `CloudModelsView.vue` | 云端模型管理：添加/编辑/删除，支持 OpenAI/Anthropic/Google/Groq/ElevenLabs/自定义 |
| 能力配置 | `ConfigView.vue` | 能力槽位分配：chat/vision/stt/tts/embedding + chatFallback + ollamaHost |
| 日志 | `LogsView.vue` | 日志查看器：按级别过滤、搜索 |
| 示例 | `ExamplesView.vue` | 示例库：分类过滤、测试状态 |
| 测试 | `TestView.vue` | API 端点测试界面：分组测试、状态追踪 |

### 组件

| 组件 | 文件 | 说明 |
|------|------|------|
| 系统状态 | `SystemStatus.vue` | 硬件信息和当前 profile 展示 |
| 设备列表 | `DeviceList.vue` | 已注册设备表格：ID、名称、类型、状态 |
| 日志查看器 | `LogViewer.vue` | 可滚动日志展示，新条目自动滚动 |
| 配置面板 | `ConfigPanel.vue` | LLM/STT/TTS 提供商编辑表单 |
| 硬件面板 | `HardwarePanel.vue` | 硬件属性定义列表 |

---

## 入口文件

- `src/index.js` — 包的主入口（package.json `main` 字段），导出核心 API：
  - `startServer`, `createApp`, `stopServer` — 来自 `server/api.js`
  - `detect` — 来自 `detector/hardware.js`
  - `getProfile` — 来自 `detector/profiles.js`
  - `matchProfile` — 来自 `detector/matcher.js`
  - `ensureOllama` — 来自 `detector/ollama.js`
  - `chat` — 来自 `server/brain.js`
  - `stt`, `tts` — 来自 `runtime/stt.js`, `runtime/tts.js`（命名空间导出）
  - `embed` — 来自 `runtime/embed.js`

---

## 测试

- 169 个测试文件，916 个测试用例（903 passed, 2 failed, 11 skipped）
- 当前失败：`test/m21-profiles.test.js` — matchProfile 对测试硬件数据抛出 "No matching profile found"（待修复）
- 覆盖率阈值 ≥98%（vitest 配置）
- 关键测试领域：硬件检测、引擎注册、配置系统、brain fallback、WebSocket hub、语音管线、Docker 部署、REST API 端点、embed 构建验证

---

## 已知限制

- **mDNS/Bonjour** — 未实现 `.local` 主机名发现，当前通过 `tunnel.js`（ngrok/cloudflared）提供跨网络 LAN 访问作为替代方案。mDNS 为 nice-to-have，不阻塞发布
- **embed.js 适配器** — `src/runtime/adapters/embed.js` 为 stub，实际嵌入通过 `src/runtime/embed.js` 使用 agentic-embed 包
