# M6 Technical Design: 服务器层 + REST API + 管理面板 + 语音UI

## server/hub.js
- WebSocket 服务器，管理设备连接
- `register(ws, deviceInfo)` → 存入 devices Map
- `broadcast(event, data)` → 向所有连接设备发送
- 断连时自动从 Map 移除

## server/brain.js
- LLM 编排，依赖 runtime/llm.js
- `chat(messages, tools)` → stream
- 工具调用循环：检测 tool_use → 执行 → 注入结果 → 继续生成

## server/api.js
- Express 服务器，挂载所有路由
- 依赖 hub.js、brain.js、runtime/{stt,tts,llm}.js
- 静态服务 src/ui/client/ 和 src/ui/admin/

## REST 端点
| 方法 | 路径 | 处理 |
|------|------|------|
| POST | /api/chat | brain.chat → SSE stream |
| POST | /api/transcribe | stt.transcribe(audio) → { text } |
| POST | /api/synthesize | tts.synthesize(text) → binary |
| GET | /api/status | { hardware, profile, devices } |
| GET | /api/config | 读 config.json |
| PUT | /api/config | 写 config.json |

## src/ui/admin/
- Vue 3 SPA，路由 /admin
- 三个组件：DeviceList.vue、LogViewer.vue、HardwarePanel.vue
- 通过 /api/status 轮询（2s）

## 语音UI (src/ui/client/)
- PushToTalk.vue：mousedown/touchstart 开始录音，松开发送
- VAD：Web Audio API 检测静音，自动截断
- 唤醒词：可配置关键词，匹配后激活对话

## 依赖
- hub.js + brain.js → sense.js, memory.js (M5)
- api.js → hub.js, brain.js
- 管理面板 → api.js
