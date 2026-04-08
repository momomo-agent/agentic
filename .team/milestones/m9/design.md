# M9 Technical Design - DBB 规范修复 + 一键安装完善

## 目标
修复已知 DBB gaps：tool_use 响应格式、store.delete()、CDN URL、SIGINT 处理，并完善 npx 一键安装流程。

## 涉及文件
- `src/server/brain.js` — tool_use 响应格式修复
- `src/runtime/memory.js` 或 store 封装 — del()→delete() 修复
- `src/detector/profiles.js` — CDN URL 修正
- `bin/agentic-service.js` — SIGINT 处理 + 完整安装流程

## 任务拆分
1. **task-1775499114484**: 修复 tool_use content→text、store del()→delete()、CDN URL
2. **task-1775499138579**: bin/ 入口添加 SIGINT handler
3. **task-1775499138612**: bin/ 入口完整安装流程（Ollama检查→模型拉取进度→启动→打开浏览器）
