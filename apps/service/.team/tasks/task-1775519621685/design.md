# Design: src/server/hub.js

## Interface
```js
export function registerDevice(idOrDevice, meta)  // id+meta or device object
export function unregisterDevice(id: string)
export function heartbeat(id: string)
export function getDevices(): Array<{id, meta, registeredAt, lastSeen, status}>
export function sendCommand(deviceId: string, command: {type, ...}): Promise<any>
export function initWebSocket(httpServer): WebSocketServer
export function broadcastWakeword(deviceId: string)
export function joinSession(sessionId, deviceId)
export function setSessionData(sessionId, key, value)
export function getSessionData(sessionId, key): any
```

## Logic
- `registry` Map: id → {ws, name, capabilities, lastPong}
- `devices` Map: id → {id, meta, registeredAt, lastSeen, status}
- Interval every 10s: mark devices offline if lastSeen > 60s
- `sendCommand`: only supports capture/speak/display; capture returns Promise with 10s timeout
- WS messages: register, ping/pong, wakeword, join-session, capture_result
- Ping interval 30s; drop devices with lastPong > 60s

## Error Handling
- `updateStatus` on unknown id: throw
- `sendCommand` unknown device: throw
- `sendCommand` unsupported type: throw

## Dependencies
- `ws` WebSocketServer
- `node:crypto` randomUUID
- `../runtime/sense.js` (headless wakeword)
- `./brain.js` (wakeword response)

## Test Cases
- register → appears in getDevices()
- unregister → removed from registry
- heartbeat → status online, lastSeen updated
- sendCommand capture → resolves on capture_result, rejects on timeout
