# Task Design: 服务端唤醒词常驻pipeline

## Files
- `src/runtime/sense.js` — add `startWakeWordPipeline(onWake)`
- `src/server/api.js` — call on server start, stop on SIGINT

## Interface

```js
// src/runtime/sense.js
export function startWakeWordPipeline(onWake: () => void): () => void
// returns stop function
```

## Logic

```
startWakeWordPipeline(onWake):
  - Start always-on audio capture loop (mock/stub if no mic)
  - On keyword match: call onWake()
  - Return stopFn that clears the loop

In api.js startServer():
  const stopWake = startWakeWordPipeline(() => {
    broadcastToAll({ type: 'wake_word' })  // via hub
  })
  process.on('SIGINT', () => { stopWake(); server.close() })
```

## Edge Cases
- No mic available: log warning, return no-op stop function
- Multiple calls: only one pipeline active (guard with flag)

## Test Cases
- onWake callback fires when keyword detected (mock audio source)
- stop function halts pipeline
- SIGINT stops pipeline cleanly
