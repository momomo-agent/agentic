# Design: src/server/hub.js — 设备管理中心

## Files
- `src/server/hub.js` — create

## Interface

```js
class Hub extends EventEmitter {
  constructor()
  register(deviceId, ws, meta)   // meta: { name, platform }
  unregister(deviceId)
  heartbeat(deviceId)            // update lastSeen
  list()                         // → [{ id, meta, lastSeen, online }]
  get(deviceId)                  // → device | null
  broadcast(event, data, excludeId?)
}
```

## Logic

- `devices` = `Map<deviceId, { ws, meta, lastSeen, timer }>`
- `register`: store device, set heartbeat timer (30s timeout → auto unregister + emit `device:offline`)
- `heartbeat`: reset timer
- `unregister`: clear timer, delete from map, emit `device:offline`
- `broadcast`: iterate map, skip excludeId, send `JSON.stringify({ event, data })`

## Edge Cases
- Duplicate register: overwrite existing entry (reconnect)
- ws already closed on broadcast: catch send error, call `unregister`

## Dependencies
- `events` (Node built-in)

## Tests
- register → list returns device
- heartbeat resets timeout
- unregister → list empty
- broadcast reaches all except excluded
- duplicate register replaces old entry
