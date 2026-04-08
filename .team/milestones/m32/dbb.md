# M32 DBB — Server层补全 + Admin UI + 唤醒词管道 + README + 语音延迟基准

## 验收标准

### Server层
- [ ] `src/server/hub.js` — 设备注册/心跳/多设备协调，`getDevices()` 返回设备列表
- [ ] `src/server/brain.js` — `chat(messages, tools?)` 流式推理，支持 tool calling
- [ ] `src/server/api.js` — 所有端点响应正确：POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET /api/status, GET/PUT /api/config

### 唤醒词管道
- [ ] `hub.js` 监听 `wakeword` 事件并触发 `brain.js` 推理
- [ ] 服务端唤醒词管道可在无浏览器环境启动

### 服务端感知
- [ ] `src/runtime/sense.js` 支持 headless 路径（无 videoElement）

### 文档
- [ ] `README.md` 包含 npx/全局安装/Docker 三种方式及 REST API 文档

### 语音延迟
- [ ] 基准测试脚本存在，P50 STT+LLM+TTS 端到端 <2s
