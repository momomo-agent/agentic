# 实现 src/server/hub.js

## Progress

- File already existed with registerDevice, getDevices, WebSocket support
- Added missing `updateStatus(id, status)` export per design spec
- Throws 'Device not found: {id}' for unknown ids
