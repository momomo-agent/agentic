# M32: Server层实现 (hub/brain/api) + Admin UI + README

## 目标
实现服务端核心层，关闭架构中 server/ 和 ui/admin/ 的所有 missing gaps。

## 任务

| Task | 优先级 | 依赖 |
|------|--------|------|
| task-1775519455473 创建profiles/default.json | P0 | — |
| task-1775519417265 实现src/server/hub.js | P0 | — |
| task-1775519421037 实现src/server/brain.js | P0 | hub.js |
| task-1775519425549 实现src/server/api.js | P0 | brain.js |
| task-1775519425581 实现src/ui/admin/ 管理面板 | P1 | api.js |
| task-1775517732946 README.md — npx/Docker/API文档 | P1 | — |

## 验收标准
- hub.js: 设备注册、心跳、多设备协调
- brain.js: LLM推理 + tool calling，流式响应
- api.js: REST端点暴露 brain/hub/runtime 接口
- ui/admin/: 设备管理、配置热更新、系统状态监控
- profiles/default.json: 内置默认硬件profile，离线可用
- README.md: npx/全局安装/Docker/API文档完整
