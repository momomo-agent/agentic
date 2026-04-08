# Task Design — 用户文档 README

## 文件
- `README.md` — 新建（项目根目录）

## 结构
```
# agentic-service

## Quick Start
- npx agentic-service
- npm i -g agentic-service && agentic-service
- docker run -p 3000:3000 momomo/agentic-service

## Configuration
- profiles.json 字段说明（llm/stt/tts/fallback）
- ~/.agentic-service/config.json 位置

## API Reference
- POST /api/chat       { message, history } → stream
- POST /api/transcribe { audio } → { text }
- POST /api/synthesize { text } → audio (binary)
- GET  /api/status     → { hardware, profile, devices }
- GET  /api/config     → current config
- PUT  /api/config     → update config

## Docker Deployment
- docker run 命令示例
- docker-compose.yml 示例片段
```

## 验收标准
- 包含三种安装方式的可复制命令
- 每个 API 端点有请求/响应示例
- Docker 部分包含完整可运行命令
