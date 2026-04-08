# Admin Panel UI — Technical Design

## Files to Create/Modify
- `src/ui/admin/src/App.vue` — main admin panel component
- `src/ui/admin/src/components/DeviceList.vue` — device management
- `src/ui/admin/src/components/ModelSelector.vue` — model selection
- `src/ui/admin/src/components/StatusDashboard.vue` — system status

## App.vue Structure
```vue
<template>
  <nav><!-- tabs: Status | Devices | Config --></nav>
  <StatusDashboard v-if="tab==='status'" :status="status" />
  <DeviceList v-if="tab==='devices'" :devices="status.devices" />
  <ModelSelector v-if="tab==='config'" :config="config" @save="saveConfig" />
</template>
```

## Data Flow
1. On mount: `GET /api/status` → populate `status` ref
2. On mount: `GET /api/config` → populate `config` ref
3. `saveConfig(newConfig)`: `PUT /api/config` with updated fields
4. Poll `GET /api/status` every 5s for live device/hardware updates

## StatusDashboard
- Display: `hardware.platform`, `hardware.gpu.type`, `hardware.memory`
- Display: active `profile.llm.model`, `profile.stt.provider`, `profile.tts.provider`

## DeviceList
- Table: device id, name, capabilities, status (online/offline), lastSeen
- Data from `status.devices`

## ModelSelector
- Inputs bound to `config.llm.model`, `config.stt.provider`, `config.tts.provider`
- Save button calls `PUT /api/config`

## Edge Cases
- `/api/status` fails → show error banner, retry after 10s
- `PUT /api/config` fails → show inline error, keep form state

## Test Cases
- Status dashboard renders hardware info from API response
- Config save calls `PUT /api/config` with correct body
- Device list shows offline status for stale devices
