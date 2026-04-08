# Design: DBB修复 — heartbeat 60s + wakeword广播 + SIGINT关闭

## Files to Modify

- `src/server/hub.js`

## Changes

### 1. Heartbeat timeout: 40000 → 60000

In `initWebSocket`, the `setInterval` callback checks `now - device.lastPong > 40000`.
Change to `60000`.

```javascript
if (now - device.lastPong > 60000) {
```

### 2. Device status offline threshold: 30000 → 60000

The top-level `setInterval` marks devices offline at `> 30000`. Align with heartbeat:

```javascript
d.status = (now - d.lastSeen > 60000) ? 'offline' : 'online'
```

### 3. Broadcast wakeword event

Add export function `broadcastWakeword()` that sends `{ type: 'wakeword' }` to all connected clients in `registry`:

```javascript
export function broadcastWakeword() {
  for (const device of registry.values()) {
    try { device.ws.send(JSON.stringify({ type: 'wakeword' })); } catch { /* ignore */ }
  }
}
```

In `initWebSocket`, handle incoming `wakeword` message type:

```javascript
} else if (msg.type === 'wakeword') {
  broadcastWakeword();
}
```

### 4. SIGINT graceful shutdown

In `initWebSocket`, after creating `wss`, register once:

```javascript
process.once('SIGINT', () => {
  wss.close(() => process.exit(0));
});
```

## Edge Cases

- `broadcastWakeword` skips devices with broken ws (try/catch)
- SIGINT handler uses `once` to avoid double-exit
- Heartbeat interval (30s ping) unchanged; only timeout threshold changes

## Test Cases (DBB)

- DBB-001: device silent for 61s → status offline
- DBB-002: device pings every 30s → stays online after 120s
- DBB-004: client sends `wakeword` → all connected clients receive `{ type: 'wakeword' }`
- DBB-005: SIGINT sent → process exits 0, no uncaught exceptions
