# M103 DBB — 稳定性与生产就绪

## DBB-001: Health endpoint returns component status
- Requirement: 健康检查端点 (`GET /api/health`) 返回组件状态
- Given: Service is running
- Expect: `GET /api/health` returns HTTP 200 with JSON body containing at least `ollama`, `stt`, `tts` status fields
- Verify: Response body is valid JSON with structure `{ ollama: <status>, stt: <status>, tts: <status> }`

## DBB-002: Health endpoint reflects degraded components
- Requirement: 健康检查端点 (`GET /api/health`) 返回组件状态
- Given: Ollama is unreachable (e.g. stopped)
- Expect: `GET /api/health` still returns HTTP 200 (service itself is up), but `ollama` status indicates unhealthy/degraded
- Verify: The response distinguishes healthy vs unhealthy components

## DBB-003: Health endpoint available when no engines registered
- Requirement: 健康检查端点 (`GET /api/health`) 返回组件状态
- Given: Service starts with no engines available
- Expect: `GET /api/health` returns a valid response (not 500), all components show unavailable/down
- Verify: Response is parseable JSON, HTTP status is not 5xx

## DBB-004: Error responses include code field
- Requirement: OpenAI 兼容错误格式补全：error response 添加 `code` 字段
- Given: Any API endpoint returns an error (e.g. invalid request to `/v1/chat/completions`)
- Expect: Response body matches `{ error: { message: <string>, type: <string>, code: <string|null> } }`
- Verify: All error responses across `/v1/chat/completions`, `/v1/audio/transcriptions`, `/v1/audio/speech`, `/v1/embeddings` include the `code` field

## DBB-005: Error format on missing model
- Requirement: OpenAI 兼容错误格式补全
- Given: `POST /v1/chat/completions` with a non-existent model ID
- Expect: HTTP 404 or 400, body `{ error: { message: "...", type: "...", code: "model_not_found" } }`
- Verify: Response has all three fields in the error object

## DBB-006: Error format on missing required fields
- Requirement: OpenAI 兼容错误格式补全
- Given: `POST /v1/chat/completions` with empty body (no `messages` field)
- Expect: HTTP 400, body `{ error: { message: "...", type: "invalid_request_error", code: "..." } }`
- Verify: Error object contains `message`, `type`, and `code`

## DBB-007: Invalid audio file returns 4xx
- Requirement: 音频格式校验：`/v1/audio/transcriptions` 在传入 STT 前校验文件格式
- Given: `POST /v1/audio/transcriptions` with a non-audio file (e.g. a .txt file or random bytes)
- Expect: HTTP 400 (not 500), error body with message indicating invalid audio format
- Verify: Status code is 4xx, error body matches `{ error: { message, type, code } }`

## DBB-008: Valid audio formats accepted
- Requirement: 音频格式校验
- Given: `POST /v1/audio/transcriptions` with a valid audio file (wav, mp3, webm, etc.)
- Expect: Request proceeds to STT processing (not rejected by format validation)
- Verify: Response is not a format-validation error

## DBB-009: Empty audio file returns 4xx
- Requirement: 音频格式校验
- Given: `POST /v1/audio/transcriptions` with an empty file (0 bytes)
- Expect: HTTP 400, error message about empty or invalid audio
- Verify: Status code is 4xx, not 5xx

## DBB-010: ARCHITECTURE.md has no stale references
- Requirement: ARCHITECTURE.md 清理：删除已移除文件/组件的引用
- Given: Read ARCHITECTURE.md
- Expect: No references to `memory.js`, `ConfigPanel`, `LocalModels`, `CloudModels`, or any other files/components that no longer exist in the codebase
- Verify: Search ARCHITECTURE.md for each removed item; none found

## DBB-011: Existing tests still pass
- Requirement: 所有现有测试继续通过
- Given: All m103 changes are applied
- Expect: `npm test` (or equivalent) passes with no new failures
- Verify: Test runner reports same or better pass count, zero new failures

## DBB-012: Health endpoint response time
- Requirement: 健康检查端点
- Given: Service is running under normal load
- Expect: `GET /api/health` responds within 2 seconds
- Verify: Measure response time; must be < 2000ms

## DBB-013: Engine health check detects down engine
- Requirement: 引擎健康检查 + 自动降级
- Given: Ollama engine is registered but unreachable
- Expect: `getEngineHealth('ollama')` returns `{ status: 'down', error: <string> }` after next check cycle
- Verify: Health state transitions from healthy to down, emits change event

## DBB-014: resolveModel skips down engines
- Requirement: 引擎 down 时 registry.resolveModel() 跳过
- Given: Ollama is marked down by health check, cloud engine is healthy
- Expect: `resolveModel(modelId)` skips Ollama, resolves to cloud engine
- Verify: Returned `engineId` is not 'ollama'

## DBB-015: Health check endpoint exposes engine health
- Requirement: GET /api/engines/health 端点
- Given: Service is running with engines registered
- Expect: `GET /api/engines/health` returns `{ [engineId]: { status, lastCheck, latency, error } }`
- Verify: Response is valid JSON with at least one engine entry

## DBB-016: Request queue enforces concurrency
- Requirement: 请求队列 + 并发控制
- Given: Local model concurrency=1, two simultaneous chat requests
- Expect: Second request waits in queue until first completes
- Verify: Both requests succeed, but second starts after first finishes

## DBB-017: Queue full returns 429
- Requirement: 队列满返回 HTTP 429
- Given: Queue is at capacity (e.g. maxQueue reached)
- Expect: Next request returns HTTP 429 with `Retry-After` header
- Verify: Status code is 429, `Retry-After` header is present and numeric

## DBB-018: Queue stats endpoint
- Requirement: GET /api/queue/stats 端点
- Given: Service is running with queue enabled
- Expect: `GET /api/queue/stats` returns `{ pending, active, maxConcurrency }`
- Verify: Response is valid JSON with numeric fields

## DBB-019: Ollama retry on timeout
- Requirement: Ollama 重试：超时/连接失败重试 1 次
- Given: Ollama first request times out, second succeeds
- Expect: Caller receives successful response (retry is transparent)
- Verify: Log contains `[retry] attempt=2 reason=...`

## DBB-020: Cloud retry on 429
- Requirement: Cloud 重试：429 读 Retry-After 最多 3 次
- Given: Cloud provider returns 429 with Retry-After: 1
- Expect: Request retries after 1s and succeeds
- Verify: Log contains `[retry]` entries, final response is successful

## DBB-021: Cloud retry on 5xx with exponential backoff
- Requirement: Cloud 重试：5xx 指数退避
- Given: Cloud provider returns 500 twice, then succeeds
- Expect: Request retries with increasing delays (1s, 2s) and succeeds
- Verify: Log shows 3 attempts with increasing delays

## DBB-022: No retry on 4xx (except 429)
- Requirement: 4xx 不重试
- Given: Cloud provider returns 400 Bad Request
- Expect: Error propagates immediately, no retry
- Verify: Log contains no `[retry]` entries, error is thrown

## DBB-023: Auth middleware blocks unauthenticated requests
- Requirement: API 认证中间件
- Given: `AGENTIC_API_KEY` is set, request has no Authorization header
- Expect: HTTP 401 with `{ error: { message, type: 'authentication_error' } }`
- Verify: Status code is 401, error body matches format

## DBB-024: Auth middleware accepts valid Bearer token
- Requirement: API 认证中间件
- Given: `AGENTIC_API_KEY=test-key`, request has `Authorization: Bearer test-key`
- Expect: Request proceeds normally
- Verify: Response is not 401

## DBB-025: Auth middleware exempts health endpoints
- Requirement: /health 和 /admin 免认证
- Given: `AGENTIC_API_KEY` is set, request to `/health` or `/api/health` has no auth
- Expect: Request proceeds normally (not blocked)
- Verify: Response is not 401

## DBB-026: Auth disabled when no key set
- Requirement: 未设置 key 时放行
- Given: `AGENTIC_API_KEY` is not set
- Expect: All requests proceed without auth check
- Verify: No 401 responses

## DBB-027: Graceful shutdown drains in-flight requests
- Requirement: 优雅关闭
- Given: SIGINT received while a request is in-flight
- Expect: In-flight request completes, new requests get 503, then server exits
- Verify: In-flight response is complete (not truncated), exit code is 0

## DBB-028: Graceful shutdown closes WebSocket connections
- Requirement: 关闭 WebSocket 连接
- Given: SIGINT received while WebSocket clients are connected
- Expect: Clients receive `{ type: 'shutdown' }` message before disconnect
- Verify: WebSocket close event fires on client side

## DBB-029: Graceful shutdown stops health check timer
- Requirement: 停止健康检查定时器
- Given: Health check is running, SIGINT received
- Expect: Health check timer is cleared, no more check cycles run
- Verify: No health check logs after shutdown initiated

## DBB-030: Health response uses nested components structure
- Requirement: /api/health 返回嵌套 components 结构
- Given: Service is running
- Expect: `GET /api/health` returns `{ status, components: { ollama, stt, tts }, uptime, responseTime }`
- Verify: Response has `components` key (not flat `ollama`/`stt`/`tts` at top level)
