# Design: heartbeat 超时修正为 60s

## File
`src/server/hub.js`

## Analysis
The ping interval already uses 60000ms timeout check:
```js
if (now - device.lastPong > 60000) { unregisterDevice(id); }
```
And the device status check also uses 60000ms:
```js
d.status = (now - d.lastSeen > 60000) ? 'offline' : 'online'
```

No code change required. Both thresholds are already 60s.

## Test Cases (DBB-004, DBB-005)
- DBB-004: After 40s without heartbeat → device still online; after 65s → offline
- DBB-005: Device sends heartbeat every 30s → still online after 120s
