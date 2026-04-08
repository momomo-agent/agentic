# M6 DBB - 服务器层 + REST API + 管理面板 + 语音UI

## DBB-001: POST /api/chat 返回 SSE 流
- Given: POST /api/chat { message, history }
- Expect: Content-Type: text/event-stream，逐块返回 LLM 回复
- Verify: 响应头含 text/event-stream，至少收到一个 data: 事件

## DBB-002: POST /api/transcribe 返回文本
- Given: POST /api/transcribe { audio: <base64> }
- Expect: { text: "..." }
- Verify: 返回 JSON，text 字段为非空字符串

## DBB-003: POST /api/synthesize 返回音频
- Given: POST /api/synthesize { text: "hello" }
- Expect: 返回 audio/wav 或 audio/mpeg 二进制
- Verify: Content-Type 含 audio/，响应体非空

## DBB-004: GET /api/status 返回系统状态
- Given: GET /api/status
- Expect: { hardware, profile, devices }
- Verify: 三个字段均存在

## DBB-005: GET /api/config 返回当前配置
- Given: GET /api/config
- Expect: JSON 配置对象
- Verify: 返回 200，body 为有效 JSON

## DBB-006: PUT /api/config 更新配置持久化
- Given: PUT /api/config { key: value }
- Expect: 200 OK，重启后配置保留
- Verify: 再次 GET /api/config 返回更新后的值

## DBB-007: WebSocket 设备注册
- Given: 客户端通过 WebSocket 连接 hub.js 并发送注册消息
- Expect: hub 记录设备，GET /api/status 的 devices 列表包含该设备
- Verify: devices.length >= 1

## DBB-008: brain.js 工具调用
- Given: LLM 返回 tool_use，brain.js 执行对应工具
- Expect: 工具结果注入对话，最终返回完整回复
- Verify: 响应包含工具执行结果

## DBB-009: /admin 页面加载
- Given: 浏览器访问 /admin
- Expect: 返回 200，页面含设备列表、日志、硬件信息
- Verify: HTTP 200，DOM 含三个面板

## DBB-010: push-to-talk 录音触发 STT
- Given: 用户按住 push-to-talk 按钮录音后松开
- Expect: 音频发送至 /api/transcribe，结果填入输入框
- Verify: 输入框出现转录文本

## DBB-011: VAD 自动检测触发 STT
- Given: VAD 检测到语音活动结束
- Expect: 自动发送音频至 /api/transcribe
- Verify: 无需手动操作，转录结果出现
