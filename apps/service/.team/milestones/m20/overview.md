# M20: Server层实现 (hub/brain/api) + Admin UI + 默认Profile

## Goals
实现架构中缺失的服务器核心层，完成设备管理、LLM推理、REST API及管理界面。

## Scope
- `src/server/hub.js` — 设备管理 (P0)
- `src/server/brain.js` — LLM推理 + 工具调用 (P0)
- `src/server/api.js` — REST API端点 (P0)
- `src/ui/admin/` — 管理面板 (P0)
- `profiles/default.json` — 默认硬件Profile (P0)

## Acceptance Criteria
- hub.js 实现设备注册/发现/状态管理
- brain.js 实现 chat(messages) → stream，支持工具调用
- api.js 暴露 /api/devices, /api/chat, /api/status 端点
- admin UI 可访问设备列表和系统状态
- profiles/default.json 包含标准硬件配置
