# M11: 服务器层 + Admin UI + 默认配置

## 目标
补全架构中缺失的服务器核心模块、管理面板和默认配置文件。

## 范围
- src/server/hub.js — 设备管理
- src/server/brain.js — LLM 推理 + tool call 处理
- src/server/api.js — 完整 REST 端点
- src/ui/admin/ — 管理面板
- profiles/default.json — 内置默认配置

## 验收标准
- POST /api/chat 返回 LLM 回复
- POST /api/transcribe 返回转录文本
- POST /api/synthesize 返回音频
- GET /api/status 返回服务状态
- GET/PUT /api/config 读写配置
- Admin 面板可访问设备列表和配置
- profiles/default.json 存在且格式正确
