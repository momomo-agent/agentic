# Design: WebSocket 设备协调 (task-1775495680384)

## Files to Modify
- `src/server/hub.js` — add WebSocket server + heartbeat + tool dispatch

## New Exports

```js
// Attach WS server to existing HTTP server
export function initWebSocket(httpServer) { ... }

// Send command to a specific device
export function sendCommand(deviceId, command) { ... }
// command: { type: 'speak'|'display'|'capture', ...payload }
// Returns Promise<any> — resolves with device response for capture, void for others
```

## Protocol

### Client → Server
```json
{ "type": "register", "id": "device-1", "name": "Phone", "capabilities": ["speak","display","capture"] }
{ "type": "ping" }
{ "type": "capture_result", "requestId": "...", "data": "<base64>" }
```

### Server → Client
```json
{ "type": "registered", "id": "device-1" }
{ "type": "pong" }
{ "type": "command", "requestId": "...", "action": "speak", "text": "Hello" }
{ "type": "command", "requestId": "...", "action": "capture" }
```

## Algorithm

1. `initWebSocket(httpServer)`: create `WebSocketServer({ server: httpServer })`
2. On `connection`: wait for `register` message, then call `registerDevice({ id, name, capabilities, ws })`
3. Heartbeat: `setInterval` every 30s — send `{ type: 'ping' }` to each device; if no pong within 10s, call `unregisterDevice(id)`
4. `sendCommand(deviceId, command)`:
   - Generate `requestId = crypto.randomUUID()`
   - Send `{ type: 'command', requestId, action: command.type, ...rest }`
   - For `capture`: return Promise that resolves when `capture_result` with matching `requestId` arrives (timeout 10s)
   - For others: return Promise.resolve()
5. On `close`/`error`: call `unregisterDevice(id)`

## Dependencies
- `ws` package (add to package.json if not present)
- `node:crypto` for `randomUUID()`

## Edge Cases
- `sendCommand` to unknown deviceId → throw `'Device not found: <id>'`
- `capture` timeout (10s) → reject with `'Capture timeout'`
- Device disconnects mid-capture → reject pending capture promise

## Test Cases
- Register device → appears in `getDevices()`
- Ping/pong → device stays online
- 90s no ping → device removed from `getDevices()`
- `sendCommand(id, { type: 'speak', text })` → device WS receives correct message
- `sendCommand(id, { type: 'capture' })` → resolves with image data
