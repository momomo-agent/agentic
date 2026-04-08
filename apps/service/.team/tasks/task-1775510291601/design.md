# Design: 实现 src/ui/admin/ 管理面板

## Files to Create
- `src/ui/admin/index.html`
- `src/ui/admin/App.vue`
- `src/ui/admin/components/DeviceList.vue`
- `src/ui/admin/components/SystemStatus.vue`
- `src/ui/admin/components/ConfigPanel.vue`

## Routing
Single-page app served at `/admin`. Vue Router with 3 routes:
- `/admin` → SystemStatus
- `/admin/devices` → DeviceList
- `/admin/config` → ConfigPanel

## API Calls
```js
// SystemStatus.vue
GET /api/status → { hardware, profile, devices }

// DeviceList.vue
GET /api/devices → DeviceRecord[]

// ConfigPanel.vue
GET /api/config → config object
PUT /api/config (body: partial config) → updated config
```

## Component Signatures
```js
// DeviceList.vue — displays table of devices with id/name/type/status
// SystemStatus.vue — displays hardware info + active profile
// ConfigPanel.vue — form to edit llm/stt/tts provider settings, submit via PUT /api/config
```

## Edge Cases
- API fetch fails → show error banner, don't crash
- Empty device list → show "No devices registered"

## Dependencies
- `src/server/api.js` must expose all endpoints above
- Vue 3 + Vite (already in project)

## Test Cases (DBB)
- `GET /admin` returns HTML (200)
- Page renders without JS errors
