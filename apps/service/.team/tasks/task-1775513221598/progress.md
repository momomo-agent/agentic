# 服务端常驻唤醒词检测

## Progress

- Added `startWakeWordDetection()` to `src/server/hub.js`: reads stdin, broadcasts `{ type: 'wake', keyword }` to all WS clients; skips non-TTY; respects `WAKE_WORD` env var
- Updated `src/server/api.js`: imported and called `startWakeWordDetection()` in `startServer()`
