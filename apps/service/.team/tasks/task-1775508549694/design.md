# Design: 多设备跨会话共享

## Files to Modify
- `src/server/hub.js` — add sessionId store + broadcast + join logic

## Data Structures

```js
// In hub.js (module-level)
const sessions = new Map(); // sessionId → { data: {}, deviceIds: Set }
```

## Function Signatures

```js
// Join or create a session; associates deviceId with sessionId
export function joinSession(sessionId, deviceId): void

// Store key-value data in a session
export function setSessionData(sessionId, key, value): void

// Retrieve session data
export function getSessionData(sessionId, key): any

// Broadcast sessionId to all connected devices
export function broadcastSession(sessionId): void
```

## Algorithm

### joinSession(sessionId, deviceId)
1. If `sessions` has no entry for `sessionId`, create `{ data: {}, deviceIds: new Set() }`
2. Add `deviceId` to `sessions.get(sessionId).deviceIds`

### setSessionData(sessionId, key, value)
1. If session doesn't exist, create it
2. Set `sessions.get(sessionId).data[key] = value`

### getSessionData(sessionId, key)
1. Return `sessions.get(sessionId)?.data[key] ?? null`

### broadcastSession(sessionId)
1. For each device in `registry`, send `{ type: 'session', sessionId }`

## WebSocket Integration
In `initWebSocket`, handle incoming message type `'join-session'`:
```js
case 'join-session':
  joinSession(msg.sessionId, ws._deviceId);
  broadcastSession(msg.sessionId);
  break;
```

## Edge Cases
- Single device: broadcastSession sends to that one device only (no error)
- Unknown sessionId in getSessionData: returns null
- Device disconnect: deviceIds entry remains (session data persists)

## Test Cases
- Device A joins session → `sessions` has entry with deviceId A
- Device A sets data → Device B (same sessionId) reads same value
- Single device: broadcastSession does not throw

## Verification
```bash
npm test -- --run test/m16-session.test.js
```
