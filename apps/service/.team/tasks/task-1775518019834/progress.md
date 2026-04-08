# 唤醒词服务端管道集成

## Progress

- Added `startHeadless()` to `src/runtime/sense.js`: wraps `startWakeWordPipeline` with EventEmitter, emits `'wakeword'`
- Added `init()` to `src/server/hub.js`: calls `sense.startHeadless()`, on wakeword calls `brainChat([])`, broadcasts response to all connected devices
- Assumption: `brainChat([])` triggers inference per design spec; response sent as `wakeword_response` type
