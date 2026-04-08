# 服务端唤醒词常驻pipeline

## Progress

- Added `startWakeWordPipeline(onWake)` to `src/runtime/sense.js` with single-instance guard and stub (no mic in server context)
- Wired into `startServer()` in `src/server/api.js`: calls `broadcastWakeword('server')` on wake, stops on SIGINT
