# M9: DBB 规范修复 + 一键安装完善

## 目标
修复剩余 DBB partial gaps，完善 npx 一键安装流程。

## 范围
- tool_use 响应格式修复（content→text type）
- store.js del()→delete() 命名修复
- SIGINT 优雅关闭
- CDN URL 修正
- npx 一键安装流程完整实现

## 验收标准
- DBB partial gaps 全部修复
- `npx agentic-service` 完整执行：Ollama检查→模型拉取→启动→打开浏览器
- 所有测试通过，覆盖率 ≥ 98%
