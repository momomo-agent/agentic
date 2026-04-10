# Agentic Service

本地 AI agent 服务，零配置启动。

## 架构

- `src/server/api.js` — Express API 路由
- `src/server/brain.js` — LLM 调用（Ollama + Cloud）
- `src/config.js` — 配置中心（~/.agentic-service/config.json）
- `src/ui/admin/` — Vue 3 管理后台（Vite 构建）

## UI 结构

- `App.vue` — 侧边栏导航 + 视图切换
- `views/StatusView.vue` — 系统状态（原 DashboardView 拆出）
- `views/ModelsView.vue` — 模型管理
- `views/ConfigView.vue` — 配置
- `views/ExamplesView.vue` — Demo 示例
- `views/TestView.vue` — API 测试
- `views/LogsView.vue` — 日志

## 设计规范

- 深色主题，CSS 变量在 style.css
- Notion 风格，干净简洁
- 中文 UI
