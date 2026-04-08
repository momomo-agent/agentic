# M7: 云端回退 + 设备协调 + DBB修复 + 文档

## 目标
补全剩余功能缺口：云端 LLM 回退、WebSocket 设备协调、DBB 规范修复、用户文档。

## 范围
- Cloud fallback: LLM 本地失败/超时自动切换 OpenAI/Anthropic
- WebSocket 设备注册 + 心跳 + speak/display/capture 工具
- DBB 修复: del()→delete(), tool_use 响应格式, SIGINT 关闭, CDN URL, 模型下载进度
- 用户文档 README + 安装指南

## 验收标准
- POST /api/chat 在本地 Ollama 不可用时自动回退云端
- WebSocket 设备可注册、发送心跳、接收 speak/display/capture 指令
- store.js 导出 delete() 方法
- SIGINT 信号触发优雅关闭
- README 包含安装、配置、API 说明
