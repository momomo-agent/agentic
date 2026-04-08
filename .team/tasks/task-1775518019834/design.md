# Design: 唤醒词服务端管道集成

## Files
- `src/server/hub.js` (修改)
- `src/runtime/sense.js` (依赖)

## Logic
1. In hub.js `init()`: call `sense.startHeadless()`
2. Listen on returned EventEmitter for `'wakeword'` event
3. On wakeword → call `brain.process('', [])` with empty message to trigger inference
4. Stream brain response to all connected devices via WebSocket/SSE

## Interface addition to hub.js
```js
async function init()
// Starts headless sense, wires wakeword → brain pipeline
```

## Dependencies
- `src/runtime/sense.js` — startHeadless()
- `src/server/brain.js` — process()

## Test Cases
- hub.init() starts without error
- Simulated wakeword event → brain.process called
