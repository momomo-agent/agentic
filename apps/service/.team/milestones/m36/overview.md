# M36: README + 语音延迟基准 + headless camera

## 目标
完成剩余 PRD/Vision 缺口，达到项目可交付状态。

## 任务

| Task | Gap | Priority |
|------|-----|----------|
| task-1775517732946 | README.md (npx/Docker/API文档) | P1 |
| task-1775517741153 | 语音延迟基准测试 <2s | P1 |
| task-1775517741186 | sense.js headless camera 服务端路径 | P1 |

## 验收标准
- README.md 存在于项目根目录，包含 npx/全局/Docker 安装说明及 REST API 文档
- 端到端语音延迟 (STT+LLM+TTS) 基准测试通过，P95 < 2s
- sense.js 支持无浏览器 videoElement 的服务端摄像头路径

## 前置条件
- m30 中 HTTPS 和多设备脑状态任务完成后，m36 激活
