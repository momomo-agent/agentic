# Design: src/server/hub+brain+api.js

## Files
- `src/server/hub.js` (exists)
- `src/server/brain.js` (exists)
- `src/server/api.js` (exists)

## hub.js
```js
registerDevice(id, meta) → { id, registeredAt }
unregisterDevice(id) → void
heartbeat(id) → void
getDevices() → Device[]
sendCommand(deviceId, command) → Promise<any>  // capture returns promise
broadcastWakeword(deviceId) → void
initWebSocket(httpServer) → WebSocketServer
joinSession(sessionId, deviceId) → void
setSessionData(sessionId, key, value) → void
getSessionData(sessionId, key) → any
```
Offline: 60s threshold, 10s check interval. Capture timeout: 10s.

## brain.js
```js
registerTool(name, fn) → void
chat(messages, options?) → AsyncGenerator<chunk>
// chunk: { type:'content', text } | { type:'tool_use', id, name, input } | { type:'error', error }
```
Ollama first (streaming). Falls back to OpenAI if tool_use unsupported.

## api.js
```
POST /api/chat        { message, history?, tools? } → SSE stream
POST /api/transcribe  multipart audio → { text }
POST /api/synthesize  { text } → audio/wav
GET  /api/status      → { hardware, profile, ollama, devices }
GET  /api/devices     → Device[]
GET  /api/config      → config object
PUT  /api/config      body → { ok: true }
GET  /api/logs        → last 50 log entries
```

## Edge Cases
- `/api/chat` missing message → 400
- `/api/transcribe` no file → 400
- `/api/synthesize` empty text → 400
- sendCommand unknown device → throws 'Device not found'
- sendCommand unsupported type → throws 'Unsupported command type'

## Tests
- POST /api/chat streams [DONE]
- POST /api/transcribe returns { text }
- GET /api/status returns hardware+devices
- WS register → device in getDevices()
