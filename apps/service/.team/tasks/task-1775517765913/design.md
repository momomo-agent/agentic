# Design: src/server/hub.js

## Status
File exists (171 lines). Implementation complete.

## Interface
```js
export function registerDevice(id: string, meta: object): { id, registeredAt }
export function getDevices(): Device[]
export function initWebSocket(server: http.Server): void
export function startWakeWordDetection(): void
export function broadcastWakeword(keyword: string): void
export function joinSession(sessionId, deviceId): void
export function setSessionData(sessionId, key, value): void
export function getSessionData(sessionId, key): any
export function broadcastSession(sessionId): void
```

## Logic
- `registry` Map: id → {ws, name, capabilities, lastPong}
- `devices` Map: id → {id, meta, registeredAt, lastSeen, status}
- Heartbeat: setInterval 10s, lastSeen >60s → status='offline'
- WebSocket: on 'message' dispatch to type handlers (register/pong/capture-result)
- Session: Map sessionId → {data:{}, deviceIds:Set}

## Test Cases
- `registerDevice('d1', {name:'test'})` → device in `getDevices()`
- Device not seen for >60s → status becomes 'offline'
- `broadcastWakeword('hey')` sends to all connected ws clients
