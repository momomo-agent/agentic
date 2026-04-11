# M103: 稳定性与生产就绪

## 目标

从"能跑"到"稳定跑"。引擎故障自动降级，请求不会打爆本地模型，错误处理统一。

⚠️ **上一轮 M103 被标完成但没写核心代码。这次每个 feature 必须有对应的 src/ 文件改动和测试。只改文档或 .team/ 文件不算完成。**

## Features

### F1: 引擎健康检查 + 自动降级

**必须新建文件 `src/engine/health.js`**，实现：

```js
// 每 30s 轮询所有已注册引擎的健康状态
export function startHealthCheck(intervalMs = 30000)
export function stopHealthCheck()
export function getEngineHealth(engineId) // → { status: 'healthy'|'degraded'|'down', lastCheck, latencyMs, error? }
export function getAllHealth() // → Map<engineId, HealthStatus>
```

- Ollama 健康检查：`GET http://localhost:11434/api/tags`，超时 5s
- Cloud 健康检查：ping 一次 `/v1/models`，超时 10s
- 引擎挂了 → 标记 `down`，registry.resolveModel() 跳过 down 的引擎
- 引擎恢复 → 标记 `healthy`
- 降级事件 emit 到 EventEmitter，api.js 的 `/api/status` 包含引擎健康信息
- **新增 API**: `GET /api/engines/health` 返回所有引擎健康状态

**测试要求**: 至少 5 个测试 — 健康/不健康切换、降级跳过、恢复检测、超时处理、并发安全

### F2: 请求队列 + 并发控制

**必须新建文件 `src/server/queue.js`**，实现：

```js
export function createQueue(options = { concurrency: 1, maxWaiting: 10 })
export async function enqueue(fn) // → Promise<result>，排队执行
export function getQueueStats() // → { active, waiting, completed, rejected }
```

- 本地模型（Ollama）同时只跑 1 个推理请求
- 队列满时返回 HTTP 429 + `Retry-After` header
- 云端模型允许并发（concurrency 可配置，默认 5）
- `/v1/chat/completions` 和 `/api/chat` 必须走队列
- **新增 API**: `GET /api/queue/stats` 返回队列状态

**测试要求**: 至少 5 个测试 — 串行执行、队列满 429、并发控制、stats 准确、超时取消

### F3: 重试机制

**在 `src/engine/ollama.js` 和 `src/engine/cloud.js` 中添加重试逻辑**：

- Ollama 超时/连接失败：重试 1 次，间隔 1s
- Cloud API 429：读 `Retry-After` header，等待后重试，最多 3 次
- Cloud API 5xx：指数退避（1s, 2s, 4s），最多 3 次
- 重试对调用方透明（不改 brain.js 接口）
- 重试时 log 一行 `[retry] engine=ollama attempt=2 reason=timeout`

**测试要求**: 至少 4 个测试 — 超时重试成功、429 退避、5xx 指数退避、重试耗尽报错

### F4: API 认证（可选模式）

**在 `src/server/middleware.js` 中添加认证中间件**：

```js
export function authMiddleware(apiKey) // 返回 express middleware
```

- 环境变量 `AGENTIC_API_KEY` 设置了就启用认证
- 校验 `Authorization: Bearer <key>` header
- 未认证返回 401 `{ error: { message: "Invalid API key", type: "authentication_error" } }`
- `/health` 和 `/admin` 不需要认证
- 没设置 `AGENTIC_API_KEY` 时所有请求放行

**测试要求**: 至少 4 个测试 — 有 key 校验通过、key 错误 401、无 key 配置放行、health 免认证

### F5: 优雅关闭

**在 `src/server/api.js` 或新建 `src/server/shutdown.js` 中实现**：

- `SIGINT`/`SIGTERM` 时停止接受新请求
- 等待进行中的请求完成（最多 10s）
- 关闭所有 WebSocket 连接（通知客户端 `{ type: 'shutdown' }`）
- 停止健康检查定时器
- 清理临时文件
- 退出码 0

**测试要求**: 至少 3 个测试 — 信号处理、等待进行中请求、超时强制退出

## 验收标准（硬性）

- [ ] `src/engine/health.js` 存在且被 `src/index.js` 或 `src/server/api.js` import
- [ ] `src/server/queue.js` 存在且被 chat 端点使用
- [ ] `src/engine/ollama.js` 包含 retry 逻辑（grep "retry" 能找到）
- [ ] `src/server/middleware.js` 包含 auth 中间件（grep "AGENTIC_API_KEY" 能找到）
- [ ] 新增测试 ≥ 20 个
- [ ] 所有现有测试通过
- [ ] `git diff --stat` 显示 src/ 目录有实质改动（不只是 .team/ 和文档）
