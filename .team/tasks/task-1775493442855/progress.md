# 设备管理 hub.js

## Progress

- Created `src/server/hub.js`: in-memory Map registry with registerDevice, unregisterDevice, getDevices
- Updated `src/server/api.js`: imported getDevices, added `devices: getDevices()` to GET /api/status
