# Design: 服务端感知路径 — headless camera

## File
`src/runtime/sense.js` (修改，添加 headless 路径)

## Interface
```js
startHeadless(options = {})
// options: { device?: string }
// returns: EventEmitter — emits('wakeword', keyword), emits('error', err)
```

## Logic
1. Use `node-microphone` or spawn `sox` to read audio from default input device
2. Pipe audio chunks to wakeword detector (e.g. porcupine or simple energy threshold)
3. On detection → emit `'wakeword'` event with keyword string
4. No dependency on `videoElement`, `navigator`, or browser APIs

## Dependencies
- `node-microphone` or `sox` (system)
- Existing wakeword detection logic from browser composable (port to Node)

## Test Cases
- `startHeadless()` returns EventEmitter without throwing
- On simulated audio input → emits 'wakeword'
