# Design: src/ui/admin/ — 管理面板

## Files
- `src/ui/admin/src/App.vue` — modify (add routes/tabs)
- `src/ui/admin/src/components/DeviceList.vue` — create
- `src/ui/admin/src/components/SystemStatus.vue` — create
- `src/ui/admin/src/components/ConfigPanel.vue` — create

## Interface
App.vue renders three tabs: Devices | Status | Config

### DeviceList.vue
- Fetches `GET /api/devices` on mount, polls every 10s
- Displays: id, name, status (online/offline), lastSeen

### SystemStatus.vue
- Fetches `GET /api/status` on mount
- Displays: hardware info, Ollama status, model list

### ConfigPanel.vue
- Fetches `GET /api/config` on mount
- Form with JSON textarea, `PUT /api/config` on save
- Shows success/error toast

## Logic
- All fetches use `fetch('/api/...')` (same-origin)
- Reactive data via `ref()` / `reactive()`
- No external UI library — plain CSS

## Edge Cases
- API error → show error message, don't crash
- Config save conflict → show server error message

## Tests
- DeviceList renders device rows from mocked `/api/devices`
- ConfigPanel submits PUT with updated JSON
