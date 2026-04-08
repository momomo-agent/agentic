# Design: 设备管理 hub.js

## File
- `src/server/hub.js` (create)

## Interface

```js
// In-memory device registry
// registerDevice(device: { id: string, name: string, type: string }) → void
export function registerDevice(device) {}

// unregisterDevice(id: string) → void
export function unregisterDevice(id) {}

// getDevices() → Array<{ id: string, name: string, type: string }>
export function getDevices() {}
```

## Integration with api.js

In `src/server/api.js`, update `GET /api/status`:

```js
import { getDevices } from './hub.js';
// ...
app.get('/api/status', async (req, res) => {
  const hardware = await detect();
  const ollama = await getOllamaStatus();
  res.json({ hardware, profile: {}, ollama, devices: getDevices() });
});
```

## Logic

1. Module-level `Map<id, device>` as registry
2. `registerDevice`: upsert by `device.id`
3. `unregisterDevice`: delete by id; no-op if absent
4. `getDevices`: return `Array.from(registry.values())`

## Edge Cases
- Duplicate `registerDevice` with same id → overwrite (upsert)
- `unregisterDevice` unknown id → no-op
- No devices registered → `getDevices()` returns `[]`

## Dependencies
- No external packages; imported by `src/server/api.js`

## Test Cases (DBB-006, DBB-007)
- Register 1 device → `GET /api/status` returns `devices` array with length 1
- No devices → `GET /api/status` returns `devices: []`
