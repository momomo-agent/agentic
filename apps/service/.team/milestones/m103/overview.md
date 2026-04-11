# M103: 稳定性与生产就绪

## 目标

从"能跑"到"稳定跑"。引擎故障自动降级，请求不会打爆本地模型，错误处理统一。

## Features

### F1: 引擎健康检查 + 自动降级
- 定时轮询引擎状态（每 30s）
- 引擎挂了自动标记 unavailable，请求路由到 fallback
- 引擎恢复自动标记 available
- 降级事件记录到日志 + 通知 Admin UI

### F2: 请求队列 + 并发控制
- 本地模型同时只跑 1 个推理请求（Ollama 串行）
- 多个请求排队，FIFO
- 队列满时返回 429 + Retry-After
- 云端模型允许并发（可配置上限）

### F3: 重试机制
- Ollama 超时自动重试 1 次
- 云端 API 429/5xx 指数退避重试（最多 3 次）
- 重试对调用方透明

### F4: 统一错误格式
- 所有 API 错误统一为 `{ error: { message, type, code } }`
- 兼容 OpenAI 错误格式
- 区分客户端错误（4xx）和服务端错误（5xx）
- 错误日志结构化

### F5: API 认证（可选）
- 启动时可配置 API Key：`AGENTIC_API_KEY=xxx`
- 配置了就校验 Authorization header，没配置就开放
- Admin UI 不受认证限制（同源）

### F6: 优雅关闭
- SIGINT/SIGTERM 时等待进行中的请求完成（最多 10s）
- 通知所有 WebSocket 客户端断开
- 清理临时文件

## 验收标准

- Ollama 进程被 kill 后，下一个请求自动 fallback 到云端（如果配置了）
- 10 个并发请求不会导致 OOM 或 Ollama 崩溃
- 所有 API 错误格式一致
- `kill -TERM <pid>` 后进行中的请求能正常完成
