# M7 DBB - 云端回退 + 设备协调 + DBB修复 + 文档

## DBB-001: Ollama 超时自动切换云端
- Given: Ollama 不可用，调用 `chat(messages)`
- Expect: 自动切换 OpenAI/Anthropic，返回有效 stream
- Verify: 响应含 `type: 'content'` chunk，无未处理异常

## DBB-002: Anthropic 云端回退
- Given: `ANTHROPIC_API_KEY` 已设置，config.fallback.provider = 'anthropic'
- Expect: `chat()` 使用 Anthropic API 返回流式响应
- Verify: chunk 格式与 OpenAI 回退一致

## DBB-003: 无 API Key 时报错清晰
- Given: fallback provider 为 openai，`OPENAI_API_KEY` 未设置
- Expect: 抛出 "OPENAI_API_KEY not set"，不崩溃
- Verify: 错误信息含 provider 名称

## DBB-004: WebSocket 设备注册
- Given: 客户端发送 `{ type: 'register', id, capabilities }`
- Expect: 设备加入 registry，服务端回复 `{ type: 'registered' }`
- Verify: `getDevices()` 包含该设备

## DBB-005: WebSocket 心跳
- Given: 已注册设备每 30s 发送 `{ type: 'ping' }`
- Expect: 服务端回复 `{ type: 'pong' }`
- Verify: 60s 无心跳设备被自动移除

## DBB-006: speak/display/capture 工具指令
- Given: 服务端调用 `hub.sendToDevice(id, { type: 'speak'|'display'|'capture', ... })`
- Expect: 指令送达设备，capture 返回 `{ type: 'capture_result', data }`
- Verify: 无异常，capture 结果可转发给 brain

## DBB-007: tool_use 响应格式
- Given: LLM 返回 tool_use，brain 执行工具后回复
- Expect: 回复格式 `{ role: 'tool', tool_use_id, content }`
- Verify: Anthropic 格式兼容，无 400 错误

## DBB-008: SIGINT 优雅关闭
- Given: 服务运行中发送 SIGINT
- Expect: HTTP + WebSocket server 5s 内关闭，退出码 0
- Verify: 无 unhandled rejection，无端口残留

## DBB-009: CDN URL 可访问
- Given: 首次启动拉取 profiles.json
- Expect: CDN URL 返回有效 JSON，缓存写入成功
- Verify: `~/.agentic-service/profiles.json` 存在且可解析

## DBB-010: 模型下载进度显示
- Given: 执行 `ollama pull <model>`
- Expect: 终端显示下载进度
- Verify: 进度输出可见，不静默等待

## DBB-011: README 安装与 API 文档完整
- Given: 用户阅读 README.md
- Expect: 含 npx/全局/Docker 三种安装方式 + 所有 REST 端点说明
- Verify: 每个端点有请求/响应示例
