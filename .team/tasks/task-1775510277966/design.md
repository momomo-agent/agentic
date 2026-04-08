# Design: 实现 src/server/hub.js

## File
- `src/server/hub.js` (create)

## Interface
```js
// In-memory store
const devices = new Map(); // id → DeviceRecord

export function registerDevice({ id, name, type }): DeviceRecord
// Creates or updates device entry, sets status='offline', returns record

export function getDevices(): DeviceRecord[]
// Returns Array.from(devices.values())

export function updateStatus(id: string, status: 'online'|'offline'|'busy'): void
// Throws if device not found
```

## DeviceRecord shape
```js
{ id: string, name: string, type: string, status: string, registeredAt: Date }
```

## Edge Cases
- `registerDevice` called twice with same id → update name/type, preserve registeredAt
- `updateStatus` with unknown id → throw `Error('Device not found: ' + id)`

## Test Cases
- register → getDevices includes device
- updateStatus → device.status updated
- updateStatus unknown id → throws
