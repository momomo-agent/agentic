# Design: 管理面板 src/ui/admin/

## Files
- `src/ui/admin/index.html`
- `src/ui/admin/App.vue`
- `src/ui/admin/components/DeviceList.vue`
- `src/ui/admin/components/LogViewer.vue`
- `src/ui/admin/components/HardwarePanel.vue`

## App.vue
- Three-panel layout (tabs or sections)
- Poll `/api/status` every 2s via `setInterval`
- Pass `status.devices` to DeviceList, `status.hardware` to HardwarePanel

## DeviceList.vue
- Props: `devices: Array<{ id, name }>`
- Render table of connected devices

## LogViewer.vue
- Fetch `/api/logs` (or tail from status) on mount
- Auto-scroll to bottom on new entries

## HardwarePanel.vue
- Props: `hardware: { platform, arch, gpu, memory, cpu }`
- Display as key-value list

## Dependencies
- Vue 3 (already used in client UI)
- Vite build (same config as client)

## Test Cases
- /admin loads with HTTP 200
- DeviceList renders when devices array is non-empty
- HardwarePanel shows platform and gpu fields
