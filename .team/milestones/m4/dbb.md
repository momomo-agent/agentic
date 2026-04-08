# M4 DBB - 向量嵌入 + 设备管理

## DBB-001: embed(text) 返回向量
- Requirement: embed.js — embed(text) → vector
- Given: 调用 embed("hello world")
- Expect: 返回 float32 数组，长度 > 0，所有元素为有限浮点数
- Verify: typeof result === 'object', result.every(v => isFinite(v))

## DBB-002: embed 空字符串处理
- Requirement: embed.js — embed(text) → vector
- Given: 调用 embed("")
- Expect: 返回空数组或抛出明确错误（不能静默失败）
- Verify: 结果为 [] 或 error.message 非空

## DBB-003: store.set/get 持久化
- Requirement: store — KV 存储抽象（SQLite）
- Given: store.set("key", "value")，进程重启后调用 store.get("key")
- Expect: 返回 "value"
- Verify: 重启后 get 结果与 set 值一致

## DBB-004: store.delete 删除键
- Requirement: store — KV 存储抽象（SQLite）
- Given: store.set("k", "v")，store.delete("k")，store.get("k")
- Expect: get 返回 null 或 undefined
- Verify: 删除后 get 无值

## DBB-005: store.get 不存在的键
- Requirement: store — KV 存储抽象（SQLite）
- Given: store.get("nonexistent-key")
- Expect: 返回 null 或 undefined，不抛出异常
- Verify: 无异常，返回值为 null/undefined

## DBB-006: GET /api/status 包含 devices 字段
- Requirement: server/hub.js — 接入 GET /api/status devices 字段
- Given: 至少一个设备已注册，调用 GET /api/status
- Expect: 响应 JSON 包含 "devices" 数组，数组元素含设备标识
- Verify: response.devices.length >= 1

## DBB-007: GET /api/status 无设备时 devices 为空数组
- Requirement: server/hub.js — 接入 GET /api/status devices 字段
- Given: 无设备注册，调用 GET /api/status
- Expect: response.devices === []
- Verify: 字段存在且为空数组，不缺失该字段

## DBB-008: /api/chat 支持 tool_use
- Requirement: server/brain.js — /api/chat 支持工具调用（tool_use）
- Given: POST /api/chat，body 包含 tools 定义和触发工具调用的 user message
- Expect: 响应包含 tool_use 类型内容块，含 tool name 和 input
- Verify: response.content 中存在 type === "tool_use" 的元素

## DBB-009: /api/chat 无工具时正常返回文本
- Requirement: server/brain.js — /api/chat 支持工具调用（tool_use）
- Given: POST /api/chat，body 不含 tools 字段
- Expect: 响应为普通文本回复，exit code / HTTP status 200
- Verify: response.content 包含 type === "text" 的元素
