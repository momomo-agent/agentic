# M32 技术设计 — Server层补全

## 模块概览

### hub.js (171 lines, exists)
- `registerDevice(id, meta)` / `getDevices()` / `initWebSocket(server)`
- 心跳: 10s interval 检查 lastSeen，>60s → offline
- 唤醒词: `startWakeWordDetection()` + `broadcastWakeword()`

### brain.js (118 lines, exists)
- `chat(messages, tools?)` → AsyncGenerator via `chatWithTools()`
- Tool calling: Ollama native tools API，fallback to Anthropic

### api.js (217 lines, exists)
- Express app，挂载所有 REST 端点
- 配置持久化: `~/.agentic-service/config.json`

## 新增工作

### sense.js headless路径
- `initHeadless(deviceId?)` — 用 node-canvas 或直接 Buffer 替代 videoElement
- 条件分支: `typeof window === 'undefined'` → headless path

### 唤醒词服务端管道
- hub.js 新增 `on('wakeword', handler)` 事件
- api.js 启动时调用 `startWakeWordPipeline()` → 触发 `broadcastWakeword()`

### 语音延迟基准
- `test/bench-voice-latency.js` — 录制 WAV → STT → LLM → TTS，计时输出 P50/P95

## 依赖
- `src/runtime/llm.js`, `stt.js`, `tts.js`, `sense.js`
- `express`, `ws`, `multer`
