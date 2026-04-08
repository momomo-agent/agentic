# Design: hub.js 广播 wakeword 事件

## File
`src/server/hub.js`

## Analysis
`broadcastWakeword()` already exists and is called when `msg.type === 'wakeword'` is received. However it does not include the source `deviceId` in the broadcast payload.

## Required Change
In `broadcastWakeword(deviceId)`, pass `deviceId` and include it in the broadcast:

```js
export function broadcastWakeword(deviceId) {
  for (const device of registry.values()) {
    try { device.ws.send(JSON.stringify({ type: 'wakeword', deviceId })); } catch { /* ignore */ }
  }
}
```

Call site in `initWebSocket`:
```js
} else if (msg.type === 'wakeword') {
  broadcastWakeword(deviceId);  // pass deviceId
}
```

## Test Cases (DBB-006, DBB-007)
- DBB-006: Device A sends `{type:'wakeword'}` → Device B receives `{type:'wakeword',...}`
- DBB-007: Broadcast message contains `deviceId` matching Device A's ID
