# M11 Technical Design — 服务器层 + Admin UI + 默认配置

## 涉及文件
- `src/server/hub.js` — 设备注册/心跳/状态
- `src/server/brain.js` — LLM推理 + tool call
- `src/server/api.js` — Express路由
- `src/ui/admin/` — Vue 3 管理面板
- `profiles/default.json` — 内置配置

## 关键设计
- hub.js 用 Map 存设备，setInterval 每10s扫描过期
- brain.js 包装 runtime/llm.js，处理 tool call 循环
- api.js 用 Express + SSE 实现 /api/chat 流式输出
- admin UI 两个组件：DeviceList.vue、ConfigPanel.vue
