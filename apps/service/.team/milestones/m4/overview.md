# M4: 向量嵌入 + 设备管理

## 目标
实现 agentic-embed 向量嵌入运行时、agentic-store 持久化存储，以及 server/hub.js 设备管理模块。

## 范围
- `src/runtime/embed.js` — 封装 agentic-embed，embed(text) → vector
- `src/store/` — 封装 agentic-store，KV 存储抽象（SQLite）
- `server/hub.js` — 设备注册/发现，接入 GET /api/status devices 字段
- `server/brain.js` — LLM 推理 + 工具调用，升级 /api/chat 支持 tool use

## 验收标准
- embed(text) 返回 float32 向量数组
- store.get/set/delete 持久化跨重启
- GET /api/status 返回真实 devices 列表
- /api/chat 支持工具调用（tool_use）
