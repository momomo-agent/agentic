# M13 DBB - DBB修复 + Docker + 配置热更新

## DBB-001: Heartbeat 60s 超时
- Requirement: P0 — heartbeat 超时修正为 60s
- Given: 设备连接后，60s 内无心跳
- Expect: 服务端检测到超时并断开该设备连接
- Verify: 在 59s 时设备仍在线；61s 时设备状态变为离线

## DBB-002: Heartbeat 未超时不断开
- Requirement: P0 — heartbeat 超时修正为 60s
- Given: 设备每 30s 发送一次心跳
- Expect: 设备持续保持在线状态，不被断开
- Verify: 运行 120s 后设备仍在线

## DBB-003: brain.js tool_use 响应含 text 字段
- Requirement: P0 — brain.js tool_use 响应格式修复
- Given: LLM 返回 tool_use 类型响应
- Expect: 响应消息中包含 `text` 字段（可为空字符串）
- Verify: WebSocket 收到的消息结构含 `{ text: ..., tool_use: ... }`

## DBB-004: hub.js 广播 wakeword 事件
- Requirement: P0 — hub.js 广播 wakeword 事件
- Given: 任意客户端触发唤醒词检测
- Expect: hub 向所有已连接客户端广播 `wakeword` 事件
- Verify: 两个已连接客户端均收到 `wakeword` 事件消息

## DBB-005: SIGINT 优雅关闭
- Requirement: P0 — SIGINT 优雅关闭
- Given: 服务正在运行，发送 SIGINT 信号（Ctrl+C）
- Expect: 服务完成当前请求后正常退出，exit code 为 0
- Verify: 进程退出，无 uncaught exception 日志，端口释放

## DBB-006: Docker Compose 启动服务
- Requirement: P1 — Docker 部署
- Given: 执行 `docker-compose up` （install/ 目录下）
- Expect: 服务成功启动，HTTP 端口可访问
- Verify: `curl http://localhost:<port>/health` 返回 200

## DBB-007: Docker 服务持久化配置
- Requirement: P1 — Docker 部署
- Given: docker-compose 挂载配置卷后启动
- Expect: 容器重启后配置保留
- Verify: 重启容器后 `/health` 仍返回 200，配置未重置

## DBB-008: 配置热更新 — profiles 变更自动重载
- Requirement: P1 — 配置热更新
- Given: 服务运行中，远程 profiles 内容发生变更
- Expect: 服务自动检测变更并重载配置，无需重启
- Verify: 变更后新配置生效，旧配置不再使用；服务全程无中断

## DBB-009: 配置热更新 — 无效 profiles 不崩溃
- Requirement: P1 — 配置热更新
- Given: 远程 profiles 返回格式错误的内容
- Expect: 服务保留上一次有效配置，记录错误日志，不崩溃
- Verify: 服务仍在线，`/health` 返回 200
