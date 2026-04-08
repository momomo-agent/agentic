# server/hub.js 设备管理

## Progress

Added `devices` Map, `heartbeat(id)`, and status tracking (10s interval, offline after 30s) to `src/server/hub.js`. `registerDevice` now supports both old object API and new `(id, meta)` API. Existing WebSocket logic preserved.
