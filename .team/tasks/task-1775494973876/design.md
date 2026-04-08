# Design: 服务器层 hub.js + brain.js + api.js

## Files
- `src/server/hub.js`
- `src/server/brain.js`
- `src/server/api.js`

## hub.js
```js
// WebSocket device registry
const devices = new Map()
register(ws, deviceInfo: { id, name }) → void  // stores ws in devices
broadcast(event: string, data: any) → void      // ws.send to all
// ws 'close' event → devices.delete(id)
```

## brain.js
```js
// LLM orchestration with tool-call loop
chat(messages: Array, tools?: Array, onChunk: (text) => void) → Promise<void>
// 1. Call llm.chat(messages, { tools, stream: true })
// 2. If tool_use in response → execute tool → append result → recurse
// 3. Stream text chunks via onChunk
```
Dependencies: `src/runtime/llm.js`

## api.js
```js
// Express app factory
createApp({ hub, brain, stt, tts, config }) → Express
// Mounts: /api/* routes + static ui/client + static ui/admin
```

## Error Handling
- hub: ignore send errors on closed ws
- brain: tool execution errors → inject error message, continue
- api: 500 on unhandled errors, JSON error body

## Test Cases
- hub.register + hub.broadcast → ws receives message
- brain.chat with tool_use → tool executed, result in final response
- api.js starts without error
