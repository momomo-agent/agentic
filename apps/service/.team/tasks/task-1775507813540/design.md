# Task Design: hub.js - 唤醒词事件广播

## Files to Modify
- `src/server/hub.js`

## Current State
`broadcastWakeword()` already exists and `initWebSocket` already calls it on `msg.type === 'wakeword'`. The function broadcasts to all devices in `registry`.

## Problem
Need to verify the broadcast fires for ALL connected devices, including the sender. Review whether the sender should be excluded.

Per DBB-005: "All connected devices receive a wakeword event broadcast" — sender included.

## Current Implementation (already correct)
```js
export function broadcastWakeword() {
  for (const device of registry.values()) {
    try { device.ws.send(JSON.stringify({ type: 'wakeword' })); } catch { /* ignore */ }
  }
}
// In initWebSocket message handler:
} else if (msg.type === 'wakeword') {
  broadcastWakeword();
}
```

## Verification
This task may already be implemented. Developer should:
1. Confirm `broadcastWakeword()` iterates `registry` (all connected WS devices)
2. Confirm the `wakeword` message handler calls `broadcastWakeword()`
3. If both true, mark as done after test verification

## Test Cases
- Connect 2 devices via WebSocket
- Send `{ type: 'wakeword' }` from device 1
- Both device 1 and device 2 receive `{ type: 'wakeword' }` message
