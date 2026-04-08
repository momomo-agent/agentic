# Design: src/ui/admin/ — 管理面板 (M32)

## Files
Same as task-1775519036809 — this task covers the same admin UI scope within M32.

- `src/ui/admin/src/App.vue` — tabs: Devices | Status | Config
- `src/ui/admin/src/components/DeviceList.vue` — device list with online/offline status
- `src/ui/admin/src/components/SystemStatus.vue` — hardware + Ollama info
- `src/ui/admin/src/components/ConfigPanel.vue` — config read/write with hot-reload trigger

## Additional: Config Hot-Reload
- After `PUT /api/config` succeeds, emit a WebSocket message `{ type: 'config_reload' }` from server
- Admin UI shows "Config reloaded" notification on WS message

## Edge Cases
- WS disconnect → reconnect with exponential backoff (max 5s)
- Invalid JSON in config textarea → show parse error before submitting

## Tests
- ConfigPanel shows parse error for invalid JSON
- WS `config_reload` event triggers notification
