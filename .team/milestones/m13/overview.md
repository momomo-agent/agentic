# M13: DBB修复 + Docker + 配置热更新

## 目标
修复剩余 DBB 规范偏差，完成 Docker 部署，实现配置热更新。

## 范围

### P0 — DBB 规范修复
- heartbeat 超时从 40s 修正为 60s（M7 DBB-005）
- brain.js tool_use 响应格式修复（M9 DBB 期望 text 字段）
- hub.js 广播 wakeword 事件（useWakeWord.js 依赖此事件）
- SIGINT 优雅关闭（process.on('SIGINT') handler）

### P1 — Docker 部署
- Dockerfile + docker-compose.yml（install/ 目录）

### P1 — 配置热更新
- 远程 profiles 变更时自动重载配置（watchProfiles → loadConfig）

## 验收标准
- heartbeat 60s 超时通过 DBB-005 测试
- brain.js tool_use 响应含 text 字段
- hub.js 广播 wakeword 事件
- SIGINT 触发优雅关闭
- `docker-compose up` 可启动服务
- profiles 变更后配置自动热更新
