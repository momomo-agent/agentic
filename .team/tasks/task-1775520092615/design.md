# Design: src/server/hub.js

## Status
File already exists at `src/server/hub.js` with full implementation.

## Interface
```javascript
init(): Promise<void>
registerDevice(idOrDevice: string|object, meta?: object): void
unregisterDevice(id: string): void
getDevices(): Array<{id, meta, registeredAt, lastSeen, status}>
sendCommand(deviceId: string, command: object): void
initWebSocket(server: http.Server): void
broadcastWakeword(text: string): void
joinSession(sessionId: string, deviceId: string): void
setSessionData(sessionId: string, key: string, value: any): void
getSessionData(sessionId: string, key: string): any
broadcastSession(sessionId: string): void
```

## Key Logic
- `registry` Map: id → `{ws, name, capabilities, lastPong}` (WebSocket connections)
- `devices` Map: id → `{id, meta, registeredAt, lastSeen, status}` (persistent device records)
- `sessions` Map: sessionId → `{data: {}, deviceIds: Set}` (multi-device shared state)
- Heartbeat interval (10s) marks devices offline if `lastSeen > 60s`
- `init()` starts headless sense pipeline, broadcasts wakeword response to all devices

## Edge Cases
- `sendCommand` on disconnected device → catch and ignore ws error
- `registerDevice` called twice with same id → updates existing record
- `getSessionData` on unknown session → returns `null`

## Test Cases
- `registerDevice` then `getDevices()` returns device with status `online`
- Device not seen for 61s → status becomes `offline`
- `joinSession` + `setSessionData` + `getSessionData` round-trips correctly
