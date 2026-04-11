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
