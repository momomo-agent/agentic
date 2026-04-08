# WebSocket 设备协调

## Status: Complete

Implemented in `src/server/hub.js`:
- `initWebSocket(httpServer)` — creates WS server, handles register/ping/pong/capture_result messages
- `sendCommand(deviceId, command)` — sends speak/display/capture commands; capture returns Promise with 10s timeout
- Heartbeat: pings every 30s, removes devices with no pong after 40s
- Added `ws` ^8.18.0 to package.json dependencies
- Wired `initWebSocket` into `startServer` in `src/server/api.js`
