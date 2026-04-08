# M11 DBB — 服务器层 + Admin UI + 默认配置

## DBB-001: server/hub.js 设备管理
- `registerDevice(id, meta)` 注册设备，返回 `{ id, registeredAt }`
- `heartbeat(id)` 更新 lastSeen，超过 30s 未心跳标记 offline
- `getDevices()` 返回所有设备及状态

## DBB-002: server/brain.js LLM推理
- `chat(messages, tools?)` 返回 async generator，yield `{ type, content }`
- tool call 时 yield `{ type: 'tool_call', name, args }`
- 调用失败自动 fallback 到云端

## DBB-003: server/api.js REST端点
- `POST /api/chat` 接受 `{ message, history }` 返回 SSE stream
- `POST /api/transcribe` 接受 `{ audio }` 返回 `{ text }`
- `POST /api/synthesize` 接受 `{ text }` 返回 audio buffer
- `GET /api/status` 返回 `{ hardware, profile, devices }`
- `GET /api/config` / `PUT /api/config` 读写配置

## DBB-004: ui/admin 管理面板
- 设备列表显示 id、状态、lastSeen
- 配置面板可读写当前 config，保存后立即生效

## DBB-005: profiles/default.json
- 包含 apple-silicon、nvidia、cpu-only 三种 profile
- 每个 profile 含 llm、stt、tts、fallback 字段
