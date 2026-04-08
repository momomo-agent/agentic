# M20 DBB - Server层实现 + Admin UI + 默认Profile

## DBB-001: hub.js 设备注册
- Given: 调用 `registerDevice({ id, name, type })`
- Expect: 设备存入内存，`getDevices()` 返回包含该设备
- Verify: unit test

## DBB-002: hub.js 状态更新
- Given: 已注册设备，调用 `updateStatus(id, 'online')`
- Expect: `getDevices()` 中该设备 status 为 'online'
- Verify: unit test

## DBB-003: brain.js chat 返回 stream
- Given: 调用 `chat([{ role:'user', content:'hi' }], {})`
- Expect: 返回 AsyncIterable，yield 至少一个 chunk
- Verify: unit test (mock runtime/llm.js)

## DBB-004: api.js GET /api/status 返回 200
- Given: 服务启动
- Expect: `GET /api/status` 返回 JSON 含 `{ hardware, profile, devices }`
- Verify: `curl http://localhost:3000/api/status`

## DBB-005: api.js POST /api/chat 流式响应
- Given: `POST /api/chat { message: "hello", history: [] }`
- Expect: 响应为 text/event-stream，包含 data chunks
- Verify: curl 或 test

## DBB-006: Admin UI /admin 可访问
- Given: 服务启动
- Expect: `GET /admin` 返回 HTML 页面，包含设备列表和系统状态
- Verify: browser or curl

## DBB-007: profiles/default.json 存在且结构正确
- Given: 读取 `profiles/default.json`
- Expect: 包含 `llm`, `stt`, `tts`, `fallback` 字段
- Verify: `node -e "JSON.parse(require('fs').readFileSync('profiles/default.json'))"`
