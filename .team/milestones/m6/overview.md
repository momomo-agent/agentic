# M6: 服务器层 + REST API + 管理面板 + 语音UI

## 目标
补全架构中缺失的服务器层（hub.js、brain.js、api.js），实现完整 REST API 端点，完成管理面板，并添加语音 UI 控件。

## 范围
- `src/server/hub.js` — WebSocket 设备注册与消息路由
- `src/server/brain.js` — LLM 编排与工具调用
- `src/server/api.js` — Express HTTP 服务器，挂载所有路由
- REST API: POST /api/chat, POST /api/transcribe, POST /api/synthesize, GET/PUT /api/config, GET /api/status
- `src/ui/admin/` — 设备列表、日志查看器、硬件信息面板
- Web UI 语音控件：push-to-talk 按钮、VAD 自动检测、唤醒词支持

## 验收标准
- `src/server/` 目录存在，hub.js/brain.js/api.js 均实现
- 所有 6 个 REST 端点可访问并返回正确响应
- `/admin` 页面展示设备列表和日志
- 聊天 UI 包含语音按钮，支持 push-to-talk

## 依赖
- M5 完成（sense.js、memory.js、Docker 打包）
